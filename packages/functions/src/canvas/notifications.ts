import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import type { NotificationType } from '@campusflow/shared';

import { createAndSendNotification } from '../notifications/send';

type CanvasDropRecord = {
  authorId?: string;
  authorName?: string;
  text?: string;
  parentId?: string | null;
  mentions?: string[];
};

function preview(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > 110 ? `${clean.slice(0, 107)}...` : clean;
}

/** Notify students when a Canvas card mentions them or replies to their card. */
export const notifyCanvasActivity = onDocumentCreated(
  'canvasRooms/{roomId}/drops/{dropId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const drop = snapshot.data() as CanvasDropRecord;
    const authorId = drop.authorId;
    const authorName = drop.authorName?.trim() || 'A student';
    const text = preview(drop.text || '');
    if (!authorId) return;

    const recipients = new Map<string, { type: NotificationType; title: string; body: string }>();
    for (const userId of drop.mentions ?? []) {
      if (!userId || userId === authorId) continue;
      recipients.set(userId, {
        type: 'CANVAS_MENTION',
        title: `${authorName} mentioned you on Canvas`,
        body: text ? `“${text}”` : 'You were mentioned in a Canvas card.',
      });
    }

    if (drop.parentId) {
      const parent = await snapshot.ref.parent.doc(drop.parentId).get();
      const parentAuthorId = parent.data()?.authorId as string | undefined;
      if (parentAuthorId && parentAuthorId !== authorId && !recipients.has(parentAuthorId)) {
        recipients.set(parentAuthorId, {
          type: 'CANVAS_REPLY',
          title: `${authorName} replied to your Canvas card`,
          body: text ? `“${text}”` : 'Someone added a reply to your Canvas card.',
        });
      }
    }

    await Promise.all(Array.from(recipients, ([userId, notification]) => createAndSendNotification({
      userId,
      ...notification,
      entityType: 'canvasDrops',
      entityId: `${event.params.roomId}/${event.params.dropId}`,
    })));
  },
);
