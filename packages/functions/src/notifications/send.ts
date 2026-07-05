import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import type { NotificationType } from '@campusflow/shared';
import { COLLECTIONS } from '@campusflow/shared';

import { admin, db } from '../utils/firebase';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  entityType: string;
  entityId: string;
}

function isPushEnabled(): boolean {
  return process.env.FUNCTIONS_EMULATOR !== 'true';
}

async function sendPushToUser(userId: string, title: string, body: string): Promise<void> {
  if (!isPushEnabled()) {
    logger.debug('Skipping FCM push in emulator', { userId });
    return;
  }

  const tokensSnap = await db
    .collection(COLLECTIONS.DEVICE_TOKENS)
    .where('userId', '==', userId)
    .get();

  if (tokensSnap.empty) return;

  const tokenEntries = tokensSnap.docs
    .map((doc) => ({
      docId: doc.id,
      token: doc.data().fcmToken as string,
    }))
    .filter(({ token }) => token && !token.startsWith('ExponentPushToken'));

  const tokens = tokenEntries.map((entry) => entry.token);

  if (tokens.length === 0) {
    logger.debug('No native FCM tokens for user', { userId });
    return;
  }

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { title, body },
    });
    logger.info('FCM multicast sent', {
      userId,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    const staleDocIds: string[] = [];
    response.responses.forEach((result, index) => {
      if (result.success) return;
      const code = result.error?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        staleDocIds.push(tokenEntries[index]!.docId);
      }
    });

    if (staleDocIds.length > 0) {
      await Promise.all(staleDocIds.map((docId) => db.collection(COLLECTIONS.DEVICE_TOKENS).doc(docId).delete()));
      logger.info('Removed stale FCM tokens', { userId, count: staleDocIds.length });
    }
  } catch (err) {
    logger.warn('FCM send failed', { userId, error: (err as Error).message });
  }
}

export async function createAndSendNotification(
  input: CreateNotificationInput
): Promise<string> {
  const ref = await db.collection(COLLECTIONS.NOTIFICATIONS).add({
    userId: input.userId,
    title: input.title,
    body: input.body,
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  await sendPushToUser(input.userId, input.title, input.body);

  return ref.id;
}
