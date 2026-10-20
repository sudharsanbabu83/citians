import { createHash, createHmac, randomBytes } from 'crypto';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import type { Role } from '@campusflow/shared';
import { COLLECTIONS } from '@campusflow/shared';
import { db } from './firebase';

export interface AuthContext {
  uid: string;
  role: Role;
  email: string;
  name: string;
}

export async function assertAuth(
  request: CallableRequest<unknown>
): Promise<AuthContext> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const userDoc = await db.collection(COLLECTIONS.USERS).doc(request.auth.uid).get();

  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User profile not found.');
  }

  const data = userDoc.data()!;

  if (!data.isActive) {
    throw new HttpsError('permission-denied', 'Account is inactive.');
  }

  return {
    uid: request.auth.uid,
    role: data.role as Role,
    email: data.email,
    name: data.name,
  };
}

export async function assertRole(
  request: CallableRequest<unknown>,
  allowedRoles: Role[]
): Promise<AuthContext> {
  const authContext = await assertAuth(request);

  // The Super Admin can use every existing protected operation. Individual
  // Super Admin-only operations still list only SUPER_ADMIN above.
  if (authContext.role !== 'SUPER_ADMIN' && !allowedRoles.includes(authContext.role)) {
    throw new HttpsError(
      'permission-denied',
      `Role ${authContext.role} is not authorized for this action.`
    );
  }

  return authContext;
}

export function unimplemented(functionName: string): never {
  throw new HttpsError(
    'unimplemented',
    `${functionName} is not yet implemented. Coming in a future phase.`
  );
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function generateDigitalSignature(
  payload: Record<string, string>,
  signingKey: string
): string {
  const sortedPayload = Object.keys(payload)
    .sort()
    .map((key) => `${key}=${payload[key]}`)
    .join('&');

  return createHmac('sha256', signingKey).update(sortedPayload).digest('hex');
}

export function generateApprovalId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `OD-${year}-${random}`;
}
