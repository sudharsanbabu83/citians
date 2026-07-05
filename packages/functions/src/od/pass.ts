import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@campusflow/shared';
import {
  generateApprovalId,
  generateDigitalSignature,
  generateSecureToken,
  hashToken,
} from '../utils/auth';
import { db } from '../utils/firebase';

export function getSigningKey(): string {
  const key = process.env.OD_SIGNING_KEY;
  if (key && key.length > 0) {
    return key;
  }
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    return 'campusflow-emulator-signing-key-do-not-use-in-prod';
  }
  throw new Error('OD_SIGNING_KEY is not configured. Run: firebase functions:secrets:set OD_SIGNING_KEY');
}

export function buildQrValue(approvalId: string, token: string): string {
  return `campusflow://verify?approvalId=${encodeURIComponent(approvalId)}&token=${encodeURIComponent(token)}`;
}

export function buildPassSignaturePayload(params: {
  approvalId: string;
  requestId: string;
  studentUserId: string;
  endDate: string;
}): Record<string, string> {
  return {
    approvalId: params.approvalId,
    requestId: params.requestId,
    studentUserId: params.studentUserId,
    endDate: params.endDate,
  };
}

export function signPassPayload(payload: Record<string, string>): string {
  return generateDigitalSignature(payload, getSigningKey());
}

export async function findPassByRequestId(requestId: string) {
  const snapshot = await db
    .collection(COLLECTIONS.OD_PASSES)
    .where('requestId', '==', requestId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0]!;
  return { id: doc.id, data: doc.data() };
}

export async function findPassByApprovalId(approvalId: string) {
  const snapshot = await db
    .collection(COLLECTIONS.OD_PASSES)
    .where('approvalId', '==', approvalId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0]!;
  return { id: doc.id, data: doc.data() };
}

export async function getPassToken(passId: string): Promise<string | null> {
  const snap = await db.collection(COLLECTIONS.OD_PASS_SECRETS).doc(passId).get();
  if (!snap.exists) return null;
  return (snap.data()?.qrToken as string) ?? null;
}

export async function createODPassForRequest(params: {
  requestId: string;
  studentUserId: string;
  hodUserId: string;
  departmentId: string;
  endDate: string;
}): Promise<{ passId: string; approvalId: string }> {
  const existing = await findPassByRequestId(params.requestId);
  if (existing) {
    return {
      passId: existing.id,
      approvalId: existing.data.approvalId as string,
    };
  }

  const approvalId = generateApprovalId();
  const qrToken = generateSecureToken();
  const qrTokenHash = hashToken(qrToken);
  const digitalSignature = signPassPayload(
    buildPassSignaturePayload({
      approvalId,
      requestId: params.requestId,
      studentUserId: params.studentUserId,
      endDate: params.endDate,
    })
  );

  const passRef = db.collection(COLLECTIONS.OD_PASSES).doc();

  await passRef.set({
    requestId: params.requestId,
    studentUserId: params.studentUserId,
    hodUserId: params.hodUserId,
    departmentId: params.departmentId,
    approvalId,
    qrTokenHash,
    digitalSignature,
    status: 'ACTIVE',
    issuedAt: FieldValue.serverTimestamp(),
    revokedAt: null,
    revokedBy: null,
  });

  await db.collection(COLLECTIONS.OD_PASS_SECRETS).doc(passRef.id).set({
    qrToken,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { passId: passRef.id, approvalId };
}

export function isPassExpired(endDate: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return endDate < today;
}
