import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  ACTIVE_USER_SESSION_MESSAGE,
  COLLECTIONS,
  USER_SESSION_MAX_INACTIVE_MS,
  claimUserSessionInputSchema,
  refreshUserSessionInputSchema,
  releaseUserSessionInputSchema,
} from '@campusflow/shared';

import { assertAuth } from '../utils/auth';
import { callableOptions } from '../utils/callableOptions';
import { db } from '../utils/firebase';

function sessionRef(userId: string) {
  return db.collection(COLLECTIONS.USER_SESSIONS).doc(userId);
}

function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return (value as { seconds: number }).seconds * 1000;
  }
  return null;
}

function isSessionStale(lastSeenAt: unknown): boolean {
  const ms = toMillis(lastSeenAt);
  if (ms === null) return true;
  return Date.now() - ms > USER_SESSION_MAX_INACTIVE_MS;
}

async function upsertActiveSession(
  userId: string,
  sessionId: string,
  metadata: {
    deviceLabel?: string;
    platform?: string;
    appVersion?: string;
    buildVersion?: string;
    osVersion?: string;
  } = {}
): Promise<void> {
  await db.runTransaction(async (transaction) => {
    const ref = sessionRef(userId);
    const snap = await transaction.get(ref);
    const now = FieldValue.serverTimestamp();

    if (!snap.exists) {
      transaction.set(ref, {
        userId,
        sessionId,
        ...metadata,
        deviceLabel: metadata.deviceLabel ?? null,
        lastSeenAt: now,
        createdAt: now,
      });
      return;
    }

    const existing = snap.data()!;
    const existingSessionId = existing.sessionId as string;

    if (existingSessionId === sessionId) {
      transaction.update(ref, {
        lastSeenAt: now,
        ...metadata,
      });
      return;
    }

    if (!isSessionStale(existing.lastSeenAt)) {
      throw new HttpsError('failed-precondition', ACTIVE_USER_SESSION_MESSAGE);
    }

    transaction.set(ref, {
      userId,
      sessionId,
      ...metadata,
      deviceLabel: metadata.deviceLabel ?? null,
      lastSeenAt: now,
      createdAt: now,
    });
  });
}

export const claimUserSession = onCall(callableOptions, async (request) => {
  const auth = await assertAuth(request);

  const parsed = claimUserSessionInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  await upsertActiveSession(auth.uid, parsed.data.sessionId, parsed.data);
  return { success: true as const };
});

export const refreshUserSession = onCall(callableOptions, async (request) => {
  const auth = await assertAuth(request);

  const parsed = refreshUserSessionInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const ref = sessionRef(auth.uid);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      userId: auth.uid,
      sessionId: parsed.data.sessionId,
      ...(parsed.data.currentRoute !== undefined ? { currentRoute: parsed.data.currentRoute } : {}),
      ...(parsed.data.currentFeature !== undefined ? { currentFeature: parsed.data.currentFeature } : {}),
      lastSeenAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true as const };
  }

  const existing = snap.data()!;
  if ((existing.sessionId as string) !== parsed.data.sessionId) {
    throw new HttpsError('failed-precondition', ACTIVE_USER_SESSION_MESSAGE);
  }

  await ref.update({
    lastSeenAt: FieldValue.serverTimestamp(),
    ...(parsed.data.currentRoute !== undefined ? { currentRoute: parsed.data.currentRoute } : {}),
    ...(parsed.data.currentFeature !== undefined ? { currentFeature: parsed.data.currentFeature } : {}),
  });
  return { success: true as const };
});

export const releaseUserSession = onCall(callableOptions, async (request) => {
  const auth = await assertAuth(request);

  const parsed = releaseUserSessionInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const ref = sessionRef(auth.uid);
  const snap = await ref.get();

  if (snap.exists && (snap.data()?.sessionId as string) === parsed.data.sessionId) {
    await ref.delete();
  }

  return { success: true as const };
});
