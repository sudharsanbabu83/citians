import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { FieldValue } from 'firebase-admin/firestore';
import {
  registerDeviceTokenInputSchema,
  markNotificationReadInputSchema,
  COLLECTIONS,
} from '@campusflow/shared';
import { assertAuth } from '../utils/auth';
import { callableOptions } from '../utils/callableOptions';
import { db } from '../utils/firebase';

export { createAndSendNotification } from './send';

export const registerDeviceToken = onCall(callableOptions, async (request) => {
  const auth = await assertAuth(request);

  const parsed = registerDeviceTokenInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const { fcmToken, platform, deviceId, appVersion } = parsed.data;
  const tokenDocId = `${auth.uid}_${deviceId}`;

  await db
    .collection(COLLECTIONS.DEVICE_TOKENS)
    .doc(tokenDocId)
    .set(
      {
        userId: auth.uid,
        fcmToken,
        platform,
        deviceId,
        appVersion,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  logger.info('registerDeviceToken completed', { uid: auth.uid, platform, deviceId });

  return { success: true };
});

export const markNotificationRead = onCall(callableOptions, async (request) => {
  const auth = await assertAuth(request);

  const parsed = markNotificationReadInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const ref = db.collection(COLLECTIONS.NOTIFICATIONS).doc(parsed.data.notificationId);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new HttpsError('not-found', 'Notification not found.');
  }

  if (snap.data()?.userId !== auth.uid) {
    throw new HttpsError('permission-denied', 'You cannot update this notification.');
  }

  await ref.update({ isRead: true });

  logger.info('markNotificationRead completed', {
    uid: auth.uid,
    notificationId: parsed.data.notificationId,
  });

  return { success: true };
});
