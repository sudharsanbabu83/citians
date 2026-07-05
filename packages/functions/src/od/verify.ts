import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { FieldValue } from 'firebase-admin/firestore';
import {
  COLLECTIONS,
  verifyODPassQuerySchema,
  AUDIT_ACTIONS,
} from '@campusflow/shared';
import type { VerifyODPassResponse } from '@campusflow/shared';
import { hashToken } from '../utils/auth';
import { writeAuditLog } from '../utils/audit';
import { db } from '../utils/firebase';
import { odSigningKey } from '../utils/secrets';
import {
  buildPassSignaturePayload,
  findPassByApprovalId,
  isPassExpired,
  signPassPayload,
} from './pass';

async function loadStudentRegisterNumber(studentUserId: string): Promise<string> {
  const snap = await db.collection(COLLECTIONS.STUDENTS).doc(studentUserId).get();
  if (snap.exists) {
    return (snap.data()?.registerNumber as string) ?? '—';
  }
  const q = await db
    .collection(COLLECTIONS.STUDENTS)
    .where('userId', '==', studentUserId)
    .limit(1)
    .get();
  if (q.empty) return '—';
  return (q.docs[0]!.data().registerNumber as string) ?? '—';
}

async function loadDepartmentName(departmentId: string): Promise<string> {
  const snap = await db.collection(COLLECTIONS.DEPARTMENTS).doc(departmentId).get();
  if (!snap.exists) return departmentId;
  return (snap.data()?.name as string) ?? departmentId;
}

async function writeVerificationLog(entry: {
  approvalId: string;
  passId: string;
  result: VerifyODPassResponse['verificationStatus'];
  scannedBy?: string;
}): Promise<void> {
  await db.collection(COLLECTIONS.VERIFICATION_LOGS).add({
    approvalId: entry.approvalId,
    passId: entry.passId,
    result: entry.result,
    scannedBy: entry.scannedBy ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export const verifyODPass = onRequest(
  { region: 'asia-south1', cors: true, secrets: [odSigningKey] },
  async (req, res) => {
    logger.info('verifyODPass called', { method: req.method });

    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const params = req.method === 'GET' ? req.query : req.body;

    const parsed = verifyODPassQuerySchema.safeParse({
      approvalId: params.approvalId,
      token: params.token,
    });

    if (!parsed.success) {
      res.status(400).json({
        verificationStatus: 'INVALID',
      } satisfies VerifyODPassResponse);
      return;
    }

    const { approvalId, token } = parsed.data;
    const verifiedAt = new Date().toISOString();

    const pass = await findPassByApprovalId(approvalId);
    if (!pass) {
      await writeVerificationLog({ approvalId, passId: 'unknown', result: 'INVALID' });
      res.status(404).json({ verificationStatus: 'INVALID' } satisfies VerifyODPassResponse);
      return;
    }

    const passData = pass.data;
    const tokenHash = hashToken(token);

    if (tokenHash !== passData.qrTokenHash) {
      await writeVerificationLog({ approvalId, passId: pass.id, result: 'INVALID' });
      res.status(200).json({ verificationStatus: 'INVALID' } satisfies VerifyODPassResponse);
      return;
    }

    const requestSnap = await db
      .collection(COLLECTIONS.OD_REQUESTS)
      .doc(passData.requestId as string)
      .get();

    if (!requestSnap.exists) {
      await writeVerificationLog({ approvalId, passId: pass.id, result: 'INVALID' });
      res.status(200).json({ verificationStatus: 'INVALID' } satisfies VerifyODPassResponse);
      return;
    }

    const requestData = requestSnap.data()!;
    const endDate = requestData.endDate as string;

    const validSignature = signPassPayload(
      buildPassSignaturePayload({
        approvalId: passData.approvalId as string,
        requestId: passData.requestId as string,
        studentUserId: passData.studentUserId as string,
        endDate,
      })
    );

    if (validSignature !== passData.digitalSignature) {
      await writeVerificationLog({ approvalId, passId: pass.id, result: 'TAMPERED' });
      res.status(200).json({ verificationStatus: 'TAMPERED' } satisfies VerifyODPassResponse);
      return;
    }

    if (passData.status === 'REVOKED') {
      await writeVerificationLog({ approvalId, passId: pass.id, result: 'REVOKED' });
      res.status(200).json({ verificationStatus: 'REVOKED' } satisfies VerifyODPassResponse);
      return;
    }

    if (isPassExpired(endDate) || passData.status === 'EXPIRED') {
      if (passData.status === 'ACTIVE') {
        await db.collection(COLLECTIONS.OD_PASSES).doc(pass.id).update({
          status: 'EXPIRED',
        });
      }
      await writeVerificationLog({ approvalId, passId: pass.id, result: 'EXPIRED' });
      res.status(200).json({ verificationStatus: 'EXPIRED' } satisfies VerifyODPassResponse);
      return;
    }

    const [studentSnap, hodSnap, registerNumber, departmentName] = await Promise.all([
      db.collection(COLLECTIONS.USERS).doc(passData.studentUserId as string).get(),
      db.collection(COLLECTIONS.USERS).doc(passData.hodUserId as string).get(),
      loadStudentRegisterNumber(passData.studentUserId as string),
      loadDepartmentName(passData.departmentId as string),
    ]);

    const issuedAt = passData.issuedAt?.toDate?.()
      ? passData.issuedAt.toDate().toISOString()
      : undefined;

    await writeVerificationLog({ approvalId, passId: pass.id, result: 'VALID' });

    await writeAuditLog({
      actorUserId: 'system',
      action: AUDIT_ACTIONS.OD_PASS_VERIFIED,
      entityType: COLLECTIONS.OD_PASSES,
      entityId: pass.id,
      metadata: { approvalId, requestId: passData.requestId as string },
    });

    res.status(200).json({
      verificationStatus: 'VALID',
      approvalId,
      studentName: studentSnap.exists ? (studentSnap.data()?.name as string) : undefined,
      registerNumber,
      department: departmentName,
      eventName: requestData.eventName as string,
      startDate: requestData.startDate as string,
      endDate,
      approvedBy: hodSnap.exists ? (hodSnap.data()?.name as string) : undefined,
      issuedAt,
      verifiedAt,
    } satisfies VerifyODPassResponse);
  }
);
