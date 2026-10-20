import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {
  acknowledgeEventAnnouncementInputSchema,
  publishEventAnnouncementInputSchema,
  type EventAnnouncement,
  type EventAnnouncementReceipt,
} from '@campusflow/shared';
import { z } from 'zod';

import {
  acknowledgeEventAnnouncementCallable,
  db,
  publishEventAnnouncementCallable,
} from '@/src/config/firebase';
import { monitorOperation } from '@/src/lib/telemetry';

export type PublishEventAnnouncementInput = z.infer<typeof publishEventAnnouncementInputSchema>;
export type AnnouncementItem = EventAnnouncement & { id: string; acknowledged: boolean };

function createRequestId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

export function subscribeToEventAnnouncements(
  eventId: string,
  userId: string,
  isHost: boolean,
  onValue: (items: AnnouncementItem[]) => void,
  onError: (error: Error) => void,
) {
  let announcements: Array<EventAnnouncement & { id: string }> = [];
  let receipts: EventAnnouncementReceipt[] = [];
  let offAnnouncementDocuments: Array<() => void> = [];
  const emit = () => {
    const acknowledgedIds = new Set(receipts.filter((item) => item.acknowledgedAt).map((item) => item.announcementId));
    const visible = announcements
      .map((item) => ({ ...item, acknowledged: acknowledgedIds.has(item.id) }))
      .sort((left, right) => {
        const leftMillis = typeof left.createdAt === 'object' && left.createdAt && 'toMillis' in left.createdAt ? (left.createdAt as { toMillis(): number }).toMillis() : 0;
        const rightMillis = typeof right.createdAt === 'object' && right.createdAt && 'toMillis' in right.createdAt ? (right.createdAt as { toMillis(): number }).toMillis() : 0;
        return rightMillis - leftMillis;
      });
    onValue(visible);
  };

  // Hosts can prove ownership through the query itself. Attendees deliberately
  // discover announcements through their server-created receipt documents,
  // which keeps Firestore rules enforceable without making rules act as filters.
  const offAnnouncements = isHost
    ? onSnapshot(
        query(
          collection(db, 'eventAnnouncements'),
          where('eventId', '==', eventId),
          where('organizerUserId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(100),
        ),
        (snapshot) => {
          announcements = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as EventAnnouncement) }));
          emit();
        },
        onError,
      )
    : () => undefined;

  const offReceipts = onSnapshot(
    query(collection(db, 'eventAnnouncementReceipts'), where('eventId', '==', eventId), where('userId', '==', userId)),
    (snapshot) => {
      receipts = snapshot.docs.map((item) => item.data() as EventAnnouncementReceipt);
      if (!isHost) {
        offAnnouncementDocuments.forEach((off) => off());
        offAnnouncementDocuments = [];
        announcements = [];
        const activeReceipts = receipts.filter((item) => item.isActive).slice(0, 100);
        if (activeReceipts.length === 0) emit();
        for (const receipt of activeReceipts) {
          const off = onSnapshot(doc(db, 'eventAnnouncements', receipt.announcementId), (snapshot) => {
            announcements = announcements.filter((item) => item.id !== receipt.announcementId);
            if (snapshot.exists()) {
              announcements.push({ id: snapshot.id, ...(snapshot.data() as EventAnnouncement) });
            }
            emit();
          }, onError);
          offAnnouncementDocuments.push(off);
        }
      } else {
        emit();
      }
    },
    onError,
  );
  return () => {
    offAnnouncements();
    offReceipts();
    offAnnouncementDocuments.forEach((off) => off());
  };
}

export async function publishEventAnnouncement(input: Omit<PublishEventAnnouncementInput, 'requestId'> & { requestId?: string }) {
  return monitorOperation('EVENT_BROADCAST', 'publish_announcement', async () => {
    // Keep one key for all automatic callable retries in this invocation.
    const validated = publishEventAnnouncementInputSchema.parse({ ...input, requestId: input.requestId ?? createRequestId() });
    return (await publishEventAnnouncementCallable(validated)).data;
  }, { eventId: input.eventId });
}

export async function acknowledgeEventAnnouncement(announcementId: string) {
  return monitorOperation('EVENT_BROADCAST', 'acknowledge_announcement', async () => {
    const validated = acknowledgeEventAnnouncementInputSchema.parse({ announcementId });
    return (await acknowledgeEventAnnouncementCallable(validated)).data;
  }, { announcementId });
}
