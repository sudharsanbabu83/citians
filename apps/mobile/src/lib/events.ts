import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type { Event, EventRegistration, EventType } from '@campusflow/shared';
import { COLLECTIONS } from '@campusflow/shared';

import { db } from '@/src/config/firebase';
import { toDate } from '@/src/lib/dates';

export interface EventWithId extends Event {
  id: string;
}

export interface EventRegistrationWithId extends EventRegistration {
  id: string;
}

export function formatEventDateTime(value: unknown): string {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatEventType(type: EventType): string {
  switch (type) {
    case 'HACKATHON':
      return 'Hackathon';
    case 'WORKSHOP':
      return 'Workshop';
    case 'MEETUP':
      return 'Meetup';
    default:
      return 'Event';
  }
}

export function getSeatsLabel(event: Event): string {
  if (event.maxParticipants === null) return 'Unlimited seats';
  const remaining = Math.max(0, event.maxParticipants - (event.registrationCount ?? 0));
  if (remaining === 0) {
    const waiting = event.waitlistCount ?? 0;
    return waiting > 0 ? `Full · ${waiting} waiting` : 'Full · waitlist open';
  }
  return `${remaining} of ${event.maxParticipants} seats left`;
}

export function isEventFull(event: Event): boolean {
  return event.maxParticipants !== null && (event.registrationCount ?? 0) >= event.maxParticipants;
}

export function isRegistrationOpen(event: Event): boolean {
  if (event.status !== 'PUBLISHED') return false;
  const deadline = toDate(event.registrationDeadline);
  if (!deadline) return false;
  return new Date() <= deadline;
}

function mapEvent(id: string, data: Event): EventWithId {
  return { id, ...data };
}

export async function fetchPublishedEvents(
  typeFilter?: EventType | 'ALL'
): Promise<EventWithId[]> {
  const q = query(
    collection(db, COLLECTIONS.EVENTS),
    where('status', '==', 'PUBLISHED'),
    orderBy('startAt', 'asc'),
    limit(50)
  );

  const snapshot = await getDocs(q);
  let events = snapshot.docs.map((d) => mapEvent(d.id, d.data() as Event));

  if (typeFilter && typeFilter !== 'ALL') {
    events = events.filter((event) => event.type === typeFilter);
  }

  return events;
}

export async function fetchEventById(eventId: string): Promise<EventWithId | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.EVENTS, eventId));
  if (!snap.exists()) return null;
  return mapEvent(snap.id, snap.data() as Event);
}

export async function fetchMyEvents(userId: string): Promise<EventWithId[]> {
  const q = query(
    collection(db, COLLECTIONS.EVENTS),
    where('organizerUserId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(30)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapEvent(d.id, d.data() as Event));
}

export async function fetchMyEventRegistrations(
  userId: string
): Promise<Array<EventRegistrationWithId & { event?: EventWithId }>> {
  const q = query(
    collection(db, COLLECTIONS.EVENT_REGISTRATIONS),
    where('userId', '==', userId),
    orderBy('registeredAt', 'desc'),
    limit(30)
  );

  const snapshot = await getDocs(q);
  const registrations = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as EventRegistration),
  }));

  const active = registrations.filter(
    (registration) => !['CANCELLED', 'REJECTED'].includes(registration.status)
  );

  return Promise.all(active.map(async (registration) => {
    // New registrations carry a safe event snapshot so My Passes paints in one
    // Firestore round-trip. Keep the document lookup as a legacy fallback.
    if (registration.eventTitle && registration.eventType && registration.eventStartAt) {
      return {
        ...registration,
        event: {
          id: registration.eventId,
          title: registration.eventTitle,
          type: registration.eventType,
          venue: registration.eventVenue ?? 'Venue to be announced',
          startAt: registration.eventStartAt,
        } as EventWithId,
      };
    }
    const event = await fetchEventById(registration.eventId);
    return { ...registration, event: event ?? undefined };
  }));
}

export async function fetchUserRegistrationForEvent(
  userId: string,
  eventId: string
): Promise<EventRegistrationWithId | null> {
  const q = query(
    collection(db, COLLECTIONS.EVENT_REGISTRATIONS),
    where('eventId', '==', eventId),
    where('userId', '==', userId),
    limit(10)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs.find((item) => !['CANCELLED', 'REJECTED'].includes(item.data().status));
  if (!docSnap) return null;
  return { id: docSnap.id, ...(docSnap.data() as EventRegistration) };
}

export async function fetchEventRegistrations(eventId: string): Promise<EventRegistrationWithId[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.EVENT_REGISTRATIONS), where('eventId', '==', eventId))
  );
  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as EventRegistration) }))
    .sort((a, b) => {
      const left = toDate(a.registeredAt)?.getTime() ?? 0;
      const right = toDate(b.registeredAt)?.getTime() ?? 0;
      return right - left;
    });
}

export function isApprovedEventRegistration(status: EventRegistration['status']): boolean {
  return status === 'APPROVED' || status === 'REGISTERED' || status === 'ATTENDED';
}
