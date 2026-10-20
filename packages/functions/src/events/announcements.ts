import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  AUDIT_ACTIONS,
  COLLECTIONS,
  acknowledgeEventAnnouncementInputSchema,
  publishEventAnnouncementInputSchema,
} from '@campusflow/shared';

import { sendPushToUser } from '../notifications/send';
import { writeAuditLog } from '../utils/audit';
import { assertAuth } from '../utils/auth';
import { callableOptions } from '../utils/callableOptions';
import { db } from '../utils/firebase';

const statusesForAudience = {
  APPROVED: ['APPROVED', 'REGISTERED', 'ATTENDED'],
  WAITLISTED: ['WAITLISTED'],
  ALL_REGISTERED: ['PENDING', 'WAITLISTED', 'APPROVED', 'REGISTERED', 'ATTENDED'],
  CHECKED_IN: ['ATTENDED'],
} as const;

function isAdmin(role: string): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

async function inChunks<T>(items: T[], size: number, work: (chunk: T[]) => Promise<void>) {
  for (let index = 0; index < items.length; index += size) {
    await work(items.slice(index, index + size));
  }
}

export async function revokeEventAnnouncementAccess(eventId: string, userId: string): Promise<void> {
  const receipts = await db.collection(COLLECTIONS.EVENT_ANNOUNCEMENT_RECEIPTS)
    .where('eventId', '==', eventId)
    .where('userId', '==', userId)
    .get();
  await inChunks(receipts.docs, 400, async (chunk) => {
    const batch = db.batch();
    chunk.forEach((item) => batch.update(item.ref, { isActive: false }));
    await batch.commit();
  });
}

export const publishEventAnnouncement = onCall(callableOptions, async (request) => {
  const auth = await assertAuth(request);
  const input = publishEventAnnouncementInputSchema.parse(request.data);
  const eventSnap = await db.collection(COLLECTIONS.EVENTS).doc(input.eventId).get();
  if (!eventSnap.exists) throw new HttpsError('not-found', 'Event not found.');
  const event = eventSnap.data()!;
  if (event.organizerUserId !== auth.uid && !isAdmin(auth.role)) {
    throw new HttpsError('permission-denied', 'Only the event host can publish announcements.');
  }

  const registrationSnap = await db
    .collection(COLLECTIONS.EVENT_REGISTRATIONS)
    .where('eventId', '==', input.eventId)
    .where('status', 'in', [...statusesForAudience[input.audience]])
    .get();
  const recipients = [...new Set(registrationSnap.docs.map((item) => item.data().userId as string))];
  if (recipients.length === 0) {
    throw new HttpsError('failed-precondition', 'There are no attendees in the selected audience.');
  }

  // A caller-generated key makes retries and simultaneous taps converge on one
  // announcement instead of creating duplicate broadcasts.
  const requestId = input.requestId ?? randomUUID();
  const announcementRef = db.collection(COLLECTIONS.EVENT_ANNOUNCEMENTS).doc(`${auth.uid}_${requestId}`);
  const created = await db.runTransaction(async (tx) => {
    const existing = await tx.get(announcementRef);
    if (existing.exists) return false;
    tx.create(announcementRef, {
    requestId,
    eventId: input.eventId,
    eventTitle: event.title,
    organizerUserId: event.organizerUserId,
    organizerName: event.organizerName,
    message: input.message,
    priority: input.priority,
    audience: input.audience,
    isPinned: input.isPinned,
    recipientCount: recipients.length,
    acknowledgedCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    deliveryStatus: 'DELIVERING',
    deliveredCount: 0,
  });
    return true;
  });

  if (created) await inChunks(recipients, 400, async (chunk) => {
    const batch = db.batch();
    for (const userId of chunk) {
      const receiptId = `${announcementRef.id}_${userId}`;
      batch.set(db.collection(COLLECTIONS.EVENT_ANNOUNCEMENT_RECEIPTS).doc(receiptId), {
        announcementId: announcementRef.id,
        eventId: input.eventId,
        userId,
        isActive: true,
        readAt: null,
        acknowledgedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        deliveryStatus: 'PENDING',
        deliveryAttempts: 0,
      });
    }
    await batch.commit();
  });

  const pendingReceipts = await db.collection(COLLECTIONS.EVENT_ANNOUNCEMENT_RECEIPTS)
    .where('announcementId', '==', announcementRef.id)
    .get();
  const prefix = input.priority === 'URGENT' ? 'Urgent event update' : input.priority === 'IMPORTANT' ? 'Important event update' : 'New event announcement';
  await inChunks(pendingReceipts.docs, 20, async (chunk) => {
    await Promise.all(chunk.map(async (receipt) => {
      const leaseAcquired = await db.runTransaction(async (tx) => {
        const current = await tx.get(receipt.ref);
        const data = current.data();
        if (!current.exists || data?.deliveryStatus === 'DELIVERED') return false;
        const leaseUntil = data?.deliveryLeaseUntil as Timestamp | undefined;
        if (data?.deliveryStatus === 'SENDING' && leaseUntil && leaseUntil.toMillis() > Date.now()) return false;
        tx.update(receipt.ref, {
          deliveryStatus: 'SENDING',
          deliveryAttempts: FieldValue.increment(1),
          deliveryLeaseUntil: Timestamp.fromMillis(Date.now() + 120_000),
        });
        const notificationRef = db.collection(COLLECTIONS.NOTIFICATIONS).doc(`event_${receipt.id}`);
        tx.set(notificationRef, {
          userId: data?.userId,
          title: `${prefix}: ${event.title as string}`,
          body: input.message.slice(0, 180),
          type: 'EVENT_ANNOUNCEMENT',
          entityType: COLLECTIONS.EVENT_ANNOUNCEMENTS,
          entityId: input.eventId,
          isRead: false,
          createdAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
      });
      if (!leaseAcquired) return;
      const userId = receipt.data().userId as string;
      await sendPushToUser(userId, `${prefix}: ${event.title as string}`, input.message.slice(0, 180));
      await receipt.ref.update({
        deliveryStatus: 'DELIVERED',
        deliveredAt: FieldValue.serverTimestamp(),
        deliveryLeaseUntil: FieldValue.delete(),
      });
    }));
  });

  const finalReceipts = await db.collection(COLLECTIONS.EVENT_ANNOUNCEMENT_RECEIPTS)
    .where('announcementId', '==', announcementRef.id)
    .get();
  const deliveredCount = finalReceipts.docs.filter((item) => item.data().deliveryStatus === 'DELIVERED').length;
  await announcementRef.update({
    deliveredCount,
    deliveryStatus: deliveredCount >= finalReceipts.size ? 'DELIVERED' : 'DELIVERING',
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (created) await writeAuditLog({
    actorUserId: auth.uid,
    action: AUDIT_ACTIONS.EVENT_ANNOUNCEMENT_PUBLISHED,
    entityType: COLLECTIONS.EVENT_ANNOUNCEMENTS,
    entityId: announcementRef.id,
    metadata: { eventId: input.eventId, priority: input.priority, audience: input.audience, recipientCount: recipients.length },
  });
  return { announcementId: announcementRef.id, recipientCount: finalReceipts.size, deliveredCount };
});

export const acknowledgeEventAnnouncement = onCall(callableOptions, async (request) => {
  const auth = await assertAuth(request);
  const input = acknowledgeEventAnnouncementInputSchema.parse(request.data);
  const receiptRef = db.collection(COLLECTIONS.EVENT_ANNOUNCEMENT_RECEIPTS).doc(`${input.announcementId}_${auth.uid}`);
  await db.runTransaction(async (tx) => {
    const receiptSnap = await tx.get(receiptRef);
    if (!receiptSnap.exists || receiptSnap.data()?.isActive !== true) {
      throw new HttpsError('permission-denied', 'This announcement is not available to you.');
    }
    if (receiptSnap.data()?.acknowledgedAt) return;
    const announcementRef = db.collection(COLLECTIONS.EVENT_ANNOUNCEMENTS).doc(input.announcementId);
    const announcementSnap = await tx.get(announcementRef);
    if (!announcementSnap.exists) throw new HttpsError('not-found', 'Announcement not found.');
    tx.update(receiptRef, { readAt: FieldValue.serverTimestamp(), acknowledgedAt: FieldValue.serverTimestamp() });
    tx.update(announcementRef, { acknowledgedCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
  });
  return { announcementId: input.announcementId, acknowledged: true };
});
