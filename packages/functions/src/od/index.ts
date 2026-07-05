import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { FieldValue } from 'firebase-admin/firestore';
import type { HealthCheckResponse } from '@campusflow/shared';
import {
  AUDIT_ACTIONS,
  COLLECTIONS,
  submitODRequestInputSchema,
  approveODRequestInputSchema,
  rejectODRequestInputSchema,
  requestODChangesInputSchema,
  getODPassQrPayloadInputSchema,
  revokeODPassInputSchema,
} from '@campusflow/shared';
import type { ODPassQrPayload } from '@campusflow/shared';
import { assertRole } from '../utils/auth';
import { callableOptions } from '../utils/callableOptions';
import { writeAuditLog } from '../utils/audit';
import { createAndSendNotification } from '../notifications/send';
import { db } from '../utils/firebase';
import { odSigningKey } from '../utils/secrets';
import {
  buildQrValue,
  createODPassForRequest,
  findPassByRequestId,
  getPassToken,
  isPassExpired,
} from './pass';

export const healthCheck = onCall(callableOptions, async (): Promise<HealthCheckResponse> => {
  logger.info('healthCheck called');

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.FUNCTIONS_EMULATOR === 'true' ? 'emulator' : 'production',
  };
});

async function loadStudentProfile(uid: string): Promise<{
  userId: string;
  departmentId: string;
}> {
  const byId = await db.collection(COLLECTIONS.STUDENTS).doc(uid).get();
  if (byId.exists) {
    const data = byId.data()!;
    return { userId: (data.userId as string) ?? uid, departmentId: data.departmentId as string };
  }

  const query = await db
    .collection(COLLECTIONS.STUDENTS)
    .where('userId', '==', uid)
    .limit(1)
    .get();

  if (query.empty) {
    throw new HttpsError('failed-precondition', 'Student profile not found.');
  }

  const data = query.docs[0]!.data();
  return { userId: data.userId as string, departmentId: data.departmentId as string };
}

async function resolveHodUserId(departmentId: string): Promise<string> {
  const deptSnap = await db.collection(COLLECTIONS.DEPARTMENTS).doc(departmentId).get();
  if (!deptSnap.exists) {
    throw new HttpsError('failed-precondition', 'Department not found.');
  }

  const hodId = deptSnap.data()?.hodId as string | undefined;
  if (!hodId) {
    throw new HttpsError('failed-precondition', 'Department has no assigned HOD.');
  }

  return hodId;
}

async function verifyDocumentIds(requestId: string, documentIds: string[]): Promise<void> {
  if (documentIds.length === 0) return;

  const checks = await Promise.all(
    documentIds.map((docId) =>
      db
        .collection(COLLECTIONS.OD_REQUESTS)
        .doc(requestId)
        .collection('documents')
        .doc(docId)
        .get()
    )
  );

  const missing = documentIds.filter((_, i) => !checks[i]!.exists);
  if (missing.length > 0) {
    throw new HttpsError(
      'invalid-argument',
      `Document(s) not found: ${missing.join(', ')}`
    );
  }
}

export const submitODRequest = onCall(callableOptions, async (request) => {
  const auth = await assertRole(request, ['STUDENT']);

  const parsed = submitODRequestInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const input = parsed.data;

  if (input.endDate < input.startDate) {
    throw new HttpsError('invalid-argument', 'End date must be on or after start date.');
  }

  const student = await loadStudentProfile(auth.uid);
  const hodUserId = await resolveHodUserId(student.departmentId);

  const userSnap = await db.collection(COLLECTIONS.USERS).doc(auth.uid).get();
  const studentName = userSnap.exists ? (userSnap.data()?.name as string) : 'Student';

  const requestRef = input.requestId
    ? db.collection(COLLECTIONS.OD_REQUESTS).doc(input.requestId)
    : db.collection(COLLECTIONS.OD_REQUESTS).doc();

  const requestId = requestRef.id;

  if (input.documentIds?.length) {
    if (!input.requestId) {
      throw new HttpsError(
        'invalid-argument',
        'Save the request as a draft before submitting with documents.'
      );
    }
    await verifyDocumentIds(requestId, input.documentIds);
  }

  await db.runTransaction(async (transaction) => {
    const existingSnap = input.requestId ? await transaction.get(requestRef) : null;

    if (input.requestId) {
      if (!existingSnap?.exists) {
        throw new HttpsError('not-found', 'OD request not found.');
      }

      const existing = existingSnap.data()!;

      if (existing.studentUserId !== auth.uid) {
        throw new HttpsError('permission-denied', 'You do not own this request.');
      }

      if (!['DRAFT', 'CHANGES_REQUESTED'].includes(existing.status as string)) {
        throw new HttpsError(
          'failed-precondition',
          `Cannot submit request with status ${existing.status as string}.`
        );
      }
    }

    const updateData: Record<string, unknown> = {
      studentId: student.userId,
      studentUserId: auth.uid,
      studentName,
      departmentId: student.departmentId,
      hodUserId,
      eventName: input.eventName,
      purpose: input.purpose,
      organizer: input.organizer,
      location: input.location,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason,
      status: 'PENDING_HOD_REVIEW',
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      rejectionReason: FieldValue.delete(),
      changeComment: FieldValue.delete(),
    };

    if (!input.requestId) {
      updateData.createdAt = FieldValue.serverTimestamp();
      updateData.reviewedAt = null;
      transaction.set(requestRef, updateData);
    } else {
      transaction.update(requestRef, updateData);
    }
  });

  await writeAuditLog({
    actorUserId: auth.uid,
    action: AUDIT_ACTIONS.OD_SUBMITTED,
    entityType: COLLECTIONS.OD_REQUESTS,
    entityId: requestId,
    metadata: {
      eventName: input.eventName,
      departmentId: student.departmentId,
    },
  });

  await createAndSendNotification({
    userId: hodUserId,
    title: 'New OD request',
    body: `${studentName} submitted an OD request for "${input.eventName}".`,
    type: 'OD_SUBMITTED',
    entityType: COLLECTIONS.OD_REQUESTS,
    entityId: requestId,
  });

  logger.info('submitODRequest completed', { requestId, uid: auth.uid });

  return { requestId, status: 'PENDING_HOD_REVIEW' as const };
});

async function loadHodDepartmentId(uid: string): Promise<string> {
  const byId = await db.collection(COLLECTIONS.HODS).doc(uid).get();
  if (byId.exists) {
    return byId.data()!.departmentId as string;
  }

  const query = await db
    .collection(COLLECTIONS.HODS)
    .where('userId', '==', uid)
    .limit(1)
    .get();

  if (query.empty) {
    throw new HttpsError('failed-precondition', 'HOD profile not found.');
  }

  return query.docs[0]!.data().departmentId as string;
}

async function loadReviewableRequest(requestId: string, hodDepartmentId: string) {
  const snap = await db.collection(COLLECTIONS.OD_REQUESTS).doc(requestId).get();

  if (!snap.exists) {
    throw new HttpsError('not-found', 'OD request not found.');
  }

  const data = snap.data()!;

  if (data.departmentId !== hodDepartmentId) {
    throw new HttpsError('permission-denied', 'Request is not in your department.');
  }

  if (data.status !== 'PENDING_HOD_REVIEW') {
    throw new HttpsError(
      'failed-precondition',
      `Cannot review request with status ${data.status as string}.`
    );
  }

  return { ref: snap.ref, data };
}

type ReviewResult = {
  requestId: string;
  status: string;
  studentUserId: string;
};

export const approveODRequest = onCall({ ...callableOptions, secrets: [odSigningKey] }, async (request) => {
  const auth = await assertRole(request, ['HOD']);

  const parsed = approveODRequestInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const hodDepartmentId = await loadHodDepartmentId(auth.uid);
  const { ref, data } = await loadReviewableRequest(parsed.data.requestId, hodDepartmentId);

  const updateData: Record<string, unknown> = {
    status: 'APPROVED',
    reviewedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    rejectionReason: FieldValue.delete(),
    changeComment: FieldValue.delete(),
  };

  if (parsed.data.comment) {
    updateData.hodComment = parsed.data.comment;
  }

  await ref.update(updateData);

  const pass = await createODPassForRequest({
    requestId: parsed.data.requestId,
    studentUserId: data.studentUserId as string,
    hodUserId: auth.uid,
    departmentId: data.departmentId as string,
    endDate: data.endDate as string,
  });

  await writeAuditLog({
    actorUserId: auth.uid,
    action: AUDIT_ACTIONS.OD_APPROVED,
    entityType: COLLECTIONS.OD_REQUESTS,
    entityId: parsed.data.requestId,
    metadata: {
      eventName: data.eventName as string,
      studentUserId: data.studentUserId as string,
      passId: pass.passId,
      approvalId: pass.approvalId,
    },
  });

  const eventName = data.eventName as string;
  const studentUserId = data.studentUserId as string;

  await createAndSendNotification({
    userId: studentUserId,
    title: 'OD request approved',
    body: `Your OD request for "${eventName}" was approved. Your digital pass is ready.`,
    type: 'OD_PASS_GENERATED',
    entityType: COLLECTIONS.OD_REQUESTS,
    entityId: parsed.data.requestId,
  });

  logger.info('approveODRequest completed', {
    requestId: parsed.data.requestId,
    uid: auth.uid,
    passId: pass.passId,
  });

  return {
    requestId: parsed.data.requestId,
    status: 'APPROVED',
    studentUserId: data.studentUserId as string,
    passId: pass.passId,
    approvalId: pass.approvalId,
  };
});

export const rejectODRequest = onCall(callableOptions, async (request) => {
  const auth = await assertRole(request, ['HOD']);

  const parsed = rejectODRequestInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const hodDepartmentId = await loadHodDepartmentId(auth.uid);
  const { ref, data } = await loadReviewableRequest(parsed.data.requestId, hodDepartmentId);

  await ref.update({
    status: 'REJECTED',
    rejectionReason: parsed.data.rejectionReason,
    reviewedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    changeComment: FieldValue.delete(),
  });

  await writeAuditLog({
    actorUserId: auth.uid,
    action: AUDIT_ACTIONS.OD_REJECTED,
    entityType: COLLECTIONS.OD_REQUESTS,
    entityId: parsed.data.requestId,
    metadata: {
      eventName: data.eventName as string,
      studentUserId: data.studentUserId as string,
      rejectionReason: parsed.data.rejectionReason,
    },
  });

  await createAndSendNotification({
    userId: data.studentUserId as string,
    title: 'OD request rejected',
    body: `Your OD request for "${data.eventName as string}" was rejected.`,
    type: 'OD_REJECTED',
    entityType: COLLECTIONS.OD_REQUESTS,
    entityId: parsed.data.requestId,
  });

  logger.info('rejectODRequest completed', { requestId: parsed.data.requestId, uid: auth.uid });

  return {
    requestId: parsed.data.requestId,
    status: 'REJECTED',
    studentUserId: data.studentUserId as string,
  } satisfies ReviewResult;
});

export const requestODChanges = onCall(callableOptions, async (request) => {
  const auth = await assertRole(request, ['HOD']);

  const parsed = requestODChangesInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const hodDepartmentId = await loadHodDepartmentId(auth.uid);
  const { ref, data } = await loadReviewableRequest(parsed.data.requestId, hodDepartmentId);

  await ref.update({
    status: 'CHANGES_REQUESTED',
    changeComment: parsed.data.changeComment,
    reviewedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    rejectionReason: FieldValue.delete(),
  });

  await writeAuditLog({
    actorUserId: auth.uid,
    action: AUDIT_ACTIONS.OD_CHANGES_REQUESTED,
    entityType: COLLECTIONS.OD_REQUESTS,
    entityId: parsed.data.requestId,
    metadata: {
      eventName: data.eventName as string,
      studentUserId: data.studentUserId as string,
      changeComment: parsed.data.changeComment,
    },
  });

  await createAndSendNotification({
    userId: data.studentUserId as string,
    title: 'Changes requested',
    body: `Your HOD requested changes on "${data.eventName as string}". Open the request to review.`,
    type: 'OD_CHANGES_REQUESTED',
    entityType: COLLECTIONS.OD_REQUESTS,
    entityId: parsed.data.requestId,
  });

  logger.info('requestODChanges completed', { requestId: parsed.data.requestId, uid: auth.uid });

  return {
    requestId: parsed.data.requestId,
    status: 'CHANGES_REQUESTED',
    studentUserId: data.studentUserId as string,
  } satisfies ReviewResult;
});

export const revokeODPass = onCall({ region: 'asia-south1' }, async (request) => {
  const authContext = await assertRole(request, ['ADMIN']);

  const parsed = revokeODPassInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const { passId, reason } = parsed.data;
  const passRef = db.collection(COLLECTIONS.OD_PASSES).doc(passId);
  const passSnap = await passRef.get();

  if (!passSnap.exists) {
    throw new HttpsError('not-found', 'OD pass not found.');
  }

  const passData = passSnap.data()!;

  if (passData.status === 'REVOKED') {
    throw new HttpsError('failed-precondition', 'Pass is already revoked.');
  }

  await passRef.update({
    status: 'REVOKED',
    revokedAt: FieldValue.serverTimestamp(),
    revokedBy: authContext.uid,
    revokeReason: reason,
  });

  await writeAuditLog({
    actorUserId: authContext.uid,
    action: AUDIT_ACTIONS.OD_PASS_REVOKED,
    entityType: COLLECTIONS.OD_PASSES,
    entityId: passId,
    metadata: {
      reason,
      studentUserId: passData.studentUserId as string,
      requestId: passData.requestId as string,
    },
  });

  await createAndSendNotification({
    userId: passData.studentUserId as string,
    title: 'OD pass revoked',
    body: `Your digital OD pass was revoked. Reason: ${reason}`,
    type: 'OD_PASS_REVOKED',
    entityType: COLLECTIONS.OD_PASSES,
    entityId: passId,
  });

  logger.info('revokeODPass completed', { passId, uid: authContext.uid });

  return { passId, status: 'REVOKED' as const };
});

export const getODPassQrPayload = onCall({ ...callableOptions, secrets: [odSigningKey] }, async (request) => {
  const auth = await assertRole(request, ['STUDENT']);

  const parsed = getODPassQrPayloadInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const requestSnap = await db
    .collection(COLLECTIONS.OD_REQUESTS)
    .doc(parsed.data.requestId)
    .get();

  if (!requestSnap.exists) {
    throw new HttpsError('not-found', 'OD request not found.');
  }

  const requestData = requestSnap.data()!;

  if (requestData.studentUserId !== auth.uid) {
    throw new HttpsError('permission-denied', 'You do not own this request.');
  }

  if (requestData.status !== 'APPROVED') {
    throw new HttpsError('failed-precondition', 'OD pass is only available for approved requests.');
  }

  const pass = await findPassByRequestId(parsed.data.requestId);
  if (!pass) {
    throw new HttpsError('not-found', 'OD pass not found. Contact your HOD.');
  }

  const token = await getPassToken(pass.id);
  if (!token) {
    throw new HttpsError('not-found', 'OD pass token unavailable.');
  }

  const endDate = requestData.endDate as string;
  let status = pass.data.status as ODPassQrPayload['status'];
  if (status === 'ACTIVE' && isPassExpired(endDate)) {
    status = 'EXPIRED';
  }

  const approvalId = pass.data.approvalId as string;

  return {
    passId: pass.id,
    approvalId,
    qrValue: buildQrValue(approvalId, token),
    eventName: requestData.eventName as string,
    startDate: requestData.startDate as string,
    endDate,
    status,
  } satisfies ODPassQrPayload;
});
