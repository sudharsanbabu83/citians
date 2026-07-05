import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type { Notification } from '@campusflow/shared';
import { COLLECTIONS } from '@campusflow/shared';

import { db } from '@/src/config/firebase';
import { toDate } from '@/src/lib/odRequests';

export interface NotificationWithId extends Notification {
  id: string;
}

export function formatNotificationTime(value: unknown): string {
  const date = toDate(value);
  if (!date) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export async function fetchUserNotifications(
  userId: string,
  maxResults = 30
): Promise<NotificationWithId[]> {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Notification),
  }));
}

export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      where('isRead', '==', false),
      limit(50)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch {
    const recent = await fetchUserNotifications(userId, 50);
    return recent.filter((n) => !n.isRead).length;
  }
}
