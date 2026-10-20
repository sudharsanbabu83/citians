import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  AUDIT_ACTIONS,
  COLLECTIONS,
  approveAllEventRegistrationsInputSchema,
  approveEventRegistrationInputSchema,
  cancelEventInputSchema,
  checkInEventAttendeeInputSchema,
  createEventInputSchema,
  getEventTicketInputSchema,
  rejectEventRegistrationInputSchema,
  removeEventAttendeeInputSchema,
  registerForEventInputSchema,
  unregisterFromEventInputSchema,
  updateEventInputSchema,
} from '@campusflow/shared';
import type {
  CreateEventResult,
  EventCheckInResult,
  EventTicketPayload,
  RegisterForEventResult,
} from '@campusflow/shared';
import { assertAuth, assertRole } from '../utils/auth';
import { callableOptions } from '../utils/callableOptions';
import { writeAuditLog } from '../utils/audit';
import { createAndSendNotification, sendPushToUser } from '../notifications/send';
import { db } from '../utils/firebase';
import { revokeEventAnnouncementAccess } from './announcements';

interface StudentProfile {
  userId: string;
  registerNumber: string;
  departmentId: string;
}

async function loadStudentProfile(uid: string): Promise<StudentProfile> {
  const byId = await db.collection(COLLECTIONS.STUDENTS).doc(uid).get();
  if (byId.exists) {
    const data = byId.data()!;
    return {
      userId: (data.userId as string) ?? uid,
      registerNumber: data.registerNumber as string,
      departmentId: data.departmentId as string,
    };
  }

  const query = await db
    .collection(COLLECTIONS.STUDENTS)
    .where('userId', '==', uid)
    .limit(1)
    .get();

  if (query.empty) {
    throw new HttpsError('failed-precondition', 'Student profile not found.');
  }

  const data = query.docs[0]!.data();
  return {
    userId: data.userId as string,
    registerNumber: data.registerNumber as string,
    departmentId: data.departmentId as string,
  };
}

function toTimestamp(iso: string): Timestamp {
  return Timestamp.fromDate(new Date(iso));
}

function isApprovedRegistration(status: unknown): boolean {
  return status === 'APPROVED' || status === 'REGISTERED' || status === 'ATTENDED';
}

function isAppAdmin(role: string): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

function makeTicketToken(): string {
  return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
}

function buildTicketQrValue(registrationId: string, ticketToken: string): string {
  return `CITIANS-EVENT:${registrationId}:${ticketToken}`;
}

async function assertEventOrganizerOrAdmin(event: FirebaseFirestore.DocumentData, auth: { uid: string; role: string }) {
  if (event.organizerUserId !== auth.uid && !isAppAdmin(auth.role)) {
    throw new HttpsError('permission-denied', 'Only the event organizer or an admin can manage attendees.');
  }
}

async function getEventOrThrow(eventId: string) {
  const snap = await db.collection(COLLECTIONS.EVENTS).doc(eventId).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Event not found.');
  }
  return { id: snap.id, ref: snap.ref, data: snap.data()! };
}

async function getNextWaitlistedRegistration(
  tx: FirebaseFirestore.Transaction,
  eventId: string
): Promise<FirebaseFirestore.QueryDocumentSnapshot | null> {
  const queue = db
    .collection(COLLECTIONS.EVENT_REGISTRATIONS)
    .where('eventId', '==', eventId)
    .where('status', '==', 'WAITLISTED')
    .orderBy('waitlistedAt', 'asc')
    .limit(1);
  const snapshot = await tx.get(queue);
  return snapshot.empty ? null : snapshot.docs[0]!;
}

function promoteWaitlistedRegistration(
  tx: FirebaseFirestore.Transaction,
  registration: FirebaseFirestore.QueryDocumentSnapshot,
  approvalMode: string
) {
  const autoApprove = approvalMode === 'AUTO';
  const ticketToken = autoApprove ? makeTicketToken() : null;
  tx.update(registration.ref, {
    status: autoApprove ? 'APPROVED' : 'PENDING',
    promotedAt: FieldValue.serverTimestamp(),
    approvedAt: autoApprove ? FieldValue.serverTimestamp() : null,
    ticketToken,
    ticketIssuedAt: autoApprove ? FieldValue.serverTimestamp() : null,
  });
  return {
    userId: registration.data().userId as string,
    status: autoApprove ? 'APPROVED' as const : 'PENDING' as const,
  };
}

async function notifyRegistrants(
  eventId: string,
  title: string,
  body: string,
  type: 'EVENT_CANCELLED' | 'EVENT_REGISTRATION_CANCELLED'
): Promise<void> {
  const registrations = await db
    .collection(COLLECTIONS.EVENT_REGISTRATIONS)
    .where('eventId', '==', eventId)
    .where('status', 'in', ['PENDING', 'WAITLISTED', 'APPROVED', 'REGISTERED'])
    .get();

  await Promise.all(
    registrations.docs.map((doc) =>
      createAndSendNotification({
        userId: doc.data().userId as string,
        title,
        body,
        type,
        entityType: COLLECTIONS.EVENTS,
        entityId: eventId,
      })
    )
  );
}

export const createEvent = onCall(callableOptions, async (request): Promise<CreateEventResult> => {
  const auth = await assertRole(request, ['STUDENT']);
  const input = createEventInputSchema.parse(request.data);
  const student = await loadStudentProfile(auth.uid);

  const departmentId =
    input.departmentId === undefined ? student.departmentId : input.departmentId;

  if (departmentId !== null && departmentId !== student.departmentId) {
    throw new HttpsError(
      'permission-denied',
      'You can only create college-wide or your own department events.'
    );
  }

  const ref = db.collection(COLLECTIONS.EVENTS).doc();
  await ref.set({
    title: input.title,
    description: input.description,
    ...(input.posterUrl ? { posterUrl: input.posterUrl } : {}),
    type: input.type,
    organizerUserId: auth.uid,
    organizerName: auth.name,
    departmentId,
    venue: input.venue,
    startAt: toTimestamp(input.startAt),
    endAt: toTimestamp(input.endAt),
    registrationDeadline: toTimestamp(input.registrationDeadline),
    maxParticipants: input.maxParticipants ?? null,
    registrationCount: 0,
    waitlistCount: 0,
    approvedCount: 0,
    approvalMode: input.approvalMode,
    status: 'PENDING_ADMIN_REVIEW',
    tags: input.tags ?? [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAuditLog({
    actorUserId: auth.uid,
    action: AUDIT_ACTIONS.EVENT_CREATED,
    entityType: COLLECTIONS.EVENTS,
    entityId: ref.id,
    metadata: { title: input.title, type: input.type },
  });

  return { eventId: ref.id, status: 'PENDING_ADMIN_REVIEW' };
});

const eventModerationSchema = z.object({
  eventId: z.string().min(1),
  reason: z.string().trim().min(3).max(500).optional(),
});

export const approveEvent = onCall(callableOptions, async (request) => {
  const auth = await assertRole(request, ['ADMIN', 'SUPER_ADMIN']);
  const input = eventModerationSchema.parse(request.data);
  const { ref, data } = await getEventOrThrow(input.eventId);
  if (!['PENDING_ADMIN_REVIEW', 'REJECTED'].includes(data.status as string)) {
    throw new HttpsError('failed-precondition', 'Only pending events can be approved.');
  }
  await ref.update({
    status: 'PUBLISHED',
    approvalReason: input.reason ?? null,
    approvedBy: auth.uid,
    approvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await writeAuditLog({
    actorUserId: auth.uid,
    action: AUDIT_ACTIONS.EVENT_APPROVED,
    entityType: COLLECTIONS.EVENTS,
    entityId: input.eventId,
    ...(input.reason ? { metadata: { reason: input.reason } } : {}),
  });
  return { eventId: input.eventId, status: 'PUBLISHED' };
});

export const rejectEvent = onCall(callableOptions, async (request) => {
  const auth = await assertRole(request, ['ADMIN', 'SUPER_ADMIN']);
  const input = eventModerationSchema.extend({ reason: z.string().trim().min(3).max(500) }).parse(request.data);
  const { ref } = await getEventOrThrow(input.eventId);
  await ref.update({
    status: 'REJECTED',
    approvalReason: input.reason,
    rejectedBy: auth.uid,
    rejectedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await writeAuditLog({
    actorUserId: auth.uid,
    action: AUDIT_ACTIONS.EVENT_REJECTED,
    entityType: COLLECTIONS.EVENTS,
    entityId: input.eventId,
    metadata: { reason: input.reason },
  });
  return { eventId: input.eventId, status: 'REJECTED' };
});

export const updateEvent = onCall(callableOptions, async (request) => {
  const auth = await assertAuth(request);
  const input = updateEventInputSchema.parse(request.data);
  const { ref, data } = await getEventOrThrow(input.eventId);

  const isOrganizer = data.organizerUserId === auth.uid;
  if (!isOrganizer && !isAppAdmin(auth.role)) {
    throw new HttpsError('permission-denied', 'Only the organizer or admin can update this event.');
  }

  if (data.status === 'CANCELLED' || data.status === 'COMPLETED') {
    throw new HttpsError('failed-precondition', 'This event can no longer be updated.');
  }

  const startAt = (data.startAt as Timestamp).toDate();
  if (startAt <= new Date()) {
    throw new HttpsError('failed-precondition', 'Cannot update an event that has already started.');
  }

  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.posterUrl !== undefined) updates.posterUrl = input.posterUrl;
  if (input.type !== undefined) updates.type = input.type;
  if (input.venue !== undefined) updates.venue = input.venue;
  if (input.startAt !== undefined) updates.startAt = toTimestamp(input.startAt);
  if (input.endAt !== undefined) updates.endAt = toTimestamp(input.endAt);
  if (input.registrationDeadline !== undefined) {
    updates.registrationDeadline = toTimestamp(input.registrationDeadline);
  }
  if (input.maxParticipants !== undefined) {
    const currentCount = (data.registrationCount as number) ?? 0;
    if (input.maxParticipants !== null && input.maxParticipants < currentCount) {
      throw new HttpsError(
        'failed-precondition',
        'Max participants cannot be less than current registrations.'
      );
    }
    updates.maxParticipants = input.maxParticipants;
  }
  if (input.tags !== undefined) updates.tags = input.tags;

  if (isOrganizer && data.status !== 'PUBLISHED') {
    updates.status = 'PENDING_ADMIN_REVIEW';
    updates.approvalReason = null;
  }

  await ref.update(updates);

  await writeAuditLog({
    actorUserId: auth.uid,
    action: AUDIT_ACTIONS.EVENT_UPDATED,
    entityType: COLLECTIONS.EVENTS,
    entityId: input.eventId,
  });

  return { eventId: input.eventId, status: (updates.status as string | undefined) ?? (data.status as string) };
});

export const cancelEvent = onCall(callableOptions, async (request) => {
  const auth = await assertAuth(request);
  const input = cancelEventInputSchema.parse(request.data);
  const { ref, data } = await getEventOrThrow(input.eventId);

  const isOrganizer = data.organizerUserId === auth.uid;
  if (!isOrganizer && !isAppAdmin(auth.role)) {
    throw new HttpsError('permission-denied', 'Only the organizer or admin can cancel this event.');
  }

  if (data.status === 'CANCELLED') {
    throw new HttpsError('failed-precondition', 'Event is already cancelled.');
  }

  await ref.update({
    status: 'CANCELLED',
    updatedAt: FieldValue.serverTimestamp(),
  });

  const title = data.title as string;
  await notifyRegistrants(
    input.eventId,
    'Event cancelled',
    `"${title}" has been cancelled.${input.reason ? ` Reason: ${input.reason}` : ''}`,
    'EVENT_CANCELLED'
  );

  await writeAuditLog({
    actorUserId: auth.uid,
    action: AUDIT_ACTIONS.EVENT_CANCELLED,
    entityType: COLLECTIONS.EVENTS,
    entityId: input.eventId,
    ...(input.reason ? { metadata: { reason: input.reason } } : {}),
  });

  return { eventId: input.eventId, status: 'CANCELLED' };
});

export const registerForEvent = onCall(
  callableOptions,
  async (request): Promise<RegisterForEventResult> => {
    const auth = await assertRole(request, ['STUDENT']);
    const input = registerForEventInputSchema.parse(request.data);
    const student = await loadStudentProfile(auth.uid);
    if (input.registerNumber.toLowerCase() !== student.registerNumber.trim().toLowerCase()) {
      throw new HttpsError(
        'invalid-argument',
        'Register number does not match your student profile. Please correct it before continuing.'
      );
    }

    const result = await db.runTransaction(async (tx) => {
      const eventRef = db.collection(COLLECTIONS.EVENTS).doc(input.eventId);
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists) {
        throw new HttpsError('not-found', 'Event not found.');
      }

      const event = eventSnap.data()!;
      if (event.status !== 'PUBLISHED') {
        throw new HttpsError('failed-precondition', 'Registration is closed for this event.');
      }

      if (event.organizerUserId === auth.uid) {
        throw new HttpsError('failed-precondition', 'Organizers cannot register for their own event.');
      }

      const deadline = (event.registrationDeadline as Timestamp).toDate();
      if (new Date() > deadline) {
        throw new HttpsError('deadline-exceeded', 'Registration deadline has passed.');
      }

      const existingQuery = db
        .collection(COLLECTIONS.EVENT_REGISTRATIONS)
        .where('eventId', '==', input.eventId)
        .where('userId', '==', auth.uid)
        .limit(5);

      const existing = await tx.get(existingQuery);
      if (existing.docs.some((doc) => !['CANCELLED', 'REJECTED'].includes(doc.data().status as string))) {
        throw new HttpsError('already-exists', 'You are already registered for this event.');
      }

      const registrationRef = db.collection(COLLECTIONS.EVENT_REGISTRATIONS).doc();
      const maxParticipants = event.maxParticipants as number | null;
      const registrationCount = (event.registrationCount as number) ?? 0;
      const waitlistCount = (event.waitlistCount as number) ?? 0;
      const isFull = maxParticipants !== null && registrationCount >= maxParticipants;
      // Legacy events may predate approvalMode. Fail closed: an absent value
      // must never grant a seat or issue a ticket without host approval.
      const approvalMode = (event.approvalMode as string | undefined) ?? 'MANUAL';
      const autoApprove = !isFull && approvalMode === 'AUTO';
      const status = isFull ? 'WAITLISTED' as const : autoApprove ? 'APPROVED' as const : 'PENDING' as const;
      const ticketToken = autoApprove ? makeTicketToken() : null;
      tx.set(registrationRef, {
        eventId: input.eventId,
        userId: auth.uid,
        studentName: input.attendeeName.trim(),
        registerNumber: student.registerNumber,
        phoneNumber: input.phoneNumber.replace(/[\s-]/g, ''),
        departmentId: student.departmentId,
        eventTitle: event.title,
        eventType: event.type,
        eventVenue: event.venue,
        eventStartAt: event.startAt,
        status,
        registeredAt: FieldValue.serverTimestamp(),
        waitlistedAt: isFull ? FieldValue.serverTimestamp() : null,
        promotedAt: null,
        cancelledAt: null,
        approvalReason: null,
        approvedAt: autoApprove ? FieldValue.serverTimestamp() : null,
        rejectedAt: null,
        ticketToken,
        ticketIssuedAt: autoApprove ? FieldValue.serverTimestamp() : null,
        attendedAt: null,
        checkedInByUserId: null,
      });

      tx.update(eventRef, {
        registrationCount: registrationCount + (isFull ? 0 : 1),
        waitlistCount: waitlistCount + (isFull ? 1 : 0),
        approvedCount: ((event.approvedCount as number) ?? 0) + (autoApprove ? 1 : 0),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { registrationId: registrationRef.id, status };
    });

    const eventTitle = (await getEventOrThrow(input.eventId)).data.title as string;
    const notification = result.status === 'APPROVED'
      ? { title: 'Registration approved', body: `Your ticket for "${eventTitle}" is ready.`, type: 'EVENT_REGISTRATION_APPROVED' as const }
      : result.status === 'WAITLISTED'
        ? { title: 'You are on the waitlist', body: `"${eventTitle}" is full. We will notify you automatically when a seat opens.`, type: 'EVENT_REGISTRATION_WAITLISTED' as const }
        : { title: 'Registration pending', body: `Your registration for "${eventTitle}" is waiting for organizer approval.`, type: 'EVENT_REGISTRATION_PENDING' as const };

    await createAndSendNotification({
      userId: auth.uid,
      ...notification,
      entityType: COLLECTIONS.EVENTS,
      entityId: input.eventId,
    });

    await writeAuditLog({
      actorUserId: auth.uid,
      action: AUDIT_ACTIONS.EVENT_REGISTERED,
      entityType: COLLECTIONS.EVENT_REGISTRATIONS,
      entityId: result.registrationId,
      metadata: { eventId: input.eventId, status: result.status },
    });

    return {
      registrationId: result.registrationId,
      eventId: input.eventId,
      status: result.status,
    };
  }
);

export const unregisterFromEvent = onCall(callableOptions, async (request) => {
  const auth = await assertRole(request, ['STUDENT']);
  const input = unregisterFromEventInputSchema.parse(request.data);

  const result = await db.runTransaction(async (tx) => {
    const registrationQuery = db
      .collection(COLLECTIONS.EVENT_REGISTRATIONS)
      .where('eventId', '==', input.eventId)
      .where('userId', '==', auth.uid)
      .limit(5);

    const registrationSnap = await tx.get(registrationQuery);
    const registrationDoc = registrationSnap.docs.find((doc) =>
      ['PENDING', 'WAITLISTED', 'APPROVED', 'REGISTERED'].includes(doc.data().status as string)
    );
    if (!registrationDoc) {
      throw new HttpsError('not-found', 'Active registration not found.');
    }

    const eventRef = db.collection(COLLECTIONS.EVENTS).doc(input.eventId);
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) {
      throw new HttpsError('not-found', 'Event not found.');
    }

    const event = eventSnap.data()!;
    const currentStatus = registrationDoc.data().status as string;
    const wasWaitlisted = currentStatus === 'WAITLISTED';
    const registrationCount = (event.registrationCount as number) ?? 0;
    const waitlistCount = (event.waitlistCount as number) ?? 0;
    const approvedCount = (event.approvedCount as number) ?? 0;
    const nextWaitlisted = wasWaitlisted
      ? null
      : await getNextWaitlistedRegistration(tx, input.eventId);

    let nextRegistrationCount = Math.max(0, registrationCount - (wasWaitlisted ? 0 : 1));
    let nextWaitlistCount = Math.max(0, waitlistCount - (wasWaitlisted ? 1 : 0));
    let nextApprovedCount = Math.max(
      0,
      approvedCount - (isApprovedRegistration(currentStatus) ? 1 : 0)
    );
    let promoted: { userId: string; status: 'APPROVED' | 'PENDING' } | null = null;

    if (nextWaitlisted) {
      promoted = promoteWaitlistedRegistration(
        tx,
        nextWaitlisted,
        (event.approvalMode as string | undefined) ?? 'MANUAL'
      );
      nextRegistrationCount += 1;
      nextWaitlistCount = Math.max(0, nextWaitlistCount - 1);
      nextApprovedCount += promoted.status === 'APPROVED' ? 1 : 0;
    }

    tx.update(registrationDoc.ref, {
      status: 'CANCELLED',
      cancelledAt: FieldValue.serverTimestamp(),
    });

    tx.update(eventRef, {
      registrationCount: nextRegistrationCount,
      waitlistCount: nextWaitlistCount,
      approvedCount: nextApprovedCount,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { eventTitle: event.title as string, promoted, wasWaitlisted };
  });

  await revokeEventAnnouncementAccess(input.eventId, auth.uid);

  await createAndSendNotification({
    userId: auth.uid,
    title: result.wasWaitlisted ? 'Left the waitlist' : 'Registration cancelled',
    body: result.wasWaitlisted
      ? `You left the waitlist for "${result.eventTitle}".`
      : `You unregistered from "${result.eventTitle}".`,
    type: 'EVENT_REGISTRATION_CANCELLED',
    entityType: COLLECTIONS.EVENTS,
    entityId: input.eventId,
  });

  if (result.promoted) {
    await createAndSendNotification({
      userId: result.promoted.userId,
      title: result.promoted.status === 'APPROVED' ? 'A seat opened up' : 'Moved from the waitlist',
      body: result.promoted.status === 'APPROVED'
        ? `You now have a seat at "${result.eventTitle}". Your QR ticket is ready.`
        : `A seat opened at "${result.eventTitle}". Your registration is now waiting for organizer approval.`,
      type: 'EVENT_WAITLIST_PROMOTED',
      entityType: COLLECTIONS.EVENTS,
      entityId: input.eventId,
    });
  }

  await writeAuditLog({
    actorUserId: auth.uid,
    action: AUDIT_ACTIONS.EVENT_UNREGISTERED,
    entityType: COLLECTIONS.EVENTS,
    entityId: input.eventId,
  });

  return { eventId: input.eventId, status: 'CANCELLED' };
});

export const approveEventRegistration = onCall(callableOptions, async (request) => {
  const auth = await assertAuth(request);
  const input = approveEventRegistrationInputSchema.parse(request.data);
  const result = await updateRegistrationApproval(input.registrationId, auth, 'APPROVED');
  return result;
});

export const rejectEventRegistration = onCall(callableOptions, async (request) => {
  const auth = await assertAuth(request);
  const input = rejectEventRegistrationInputSchema.parse(request.data);
  const result = await updateRegistrationApproval(input.registrationId, auth, 'REJECTED', input.reason);
  return result;
});

export const removeEventAttendee = onCall(callableOptions, async (request) => {
  const auth = await assertAuth(request);
  const input = removeEventAttendeeInputSchema.parse(request.data);
  const result = await db.runTransaction(async (tx) => {
    const registrationRef = db.collection(COLLECTIONS.EVENT_REGISTRATIONS).doc(input.registrationId);
    const registrationSnap = await tx.get(registrationRef);
    if (!registrationSnap.exists) throw new HttpsError('not-found', 'Registration not found.');
    const registration = registrationSnap.data()!;
    const currentStatus = registration.status as string;
    if (!['PENDING', 'WAITLISTED', 'APPROVED', 'REGISTERED'].includes(currentStatus)) {
      throw new HttpsError('failed-precondition', 'This attendee can no longer be removed.');
    }

    const eventRef = db.collection(COLLECTIONS.EVENTS).doc(registration.eventId as string);
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) throw new HttpsError('not-found', 'Event not found.');
    const event = eventSnap.data()!;
    await assertEventOrganizerOrAdmin(event, auth);

    const wasWaitlisted = currentStatus === 'WAITLISTED';
    const nextWaitlisted = wasWaitlisted
      ? null
      : await getNextWaitlistedRegistration(tx, registration.eventId as string);
    let registrationCount = Math.max(0, ((event.registrationCount as number) ?? 0) - (wasWaitlisted ? 0 : 1));
    let waitlistCount = Math.max(0, ((event.waitlistCount as number) ?? 0) - (wasWaitlisted ? 1 : 0));
    let approvedCount = Math.max(
      0,
      ((event.approvedCount as number) ?? 0) - (isApprovedRegistration(currentStatus) ? 1 : 0)
    );
    let promoted: { userId: string; status: 'APPROVED' | 'PENDING' } | null = null;

    if (nextWaitlisted) {
      promoted = promoteWaitlistedRegistration(
        tx,
        nextWaitlisted,
        (event.approvalMode as string | undefined) ?? 'MANUAL'
      );
      registrationCount += 1;
      waitlistCount = Math.max(0, waitlistCount - 1);
      approvedCount += promoted.status === 'APPROVED' ? 1 : 0;
    }

    tx.update(registrationRef, {
      status: 'REJECTED',
      approvalReason: input.reason ?? 'Removed by the event organizer.',
      rejectedAt: FieldValue.serverTimestamp(),
      ticketToken: null,
      ticketIssuedAt: null,
    });
    tx.update(eventRef, {
      registrationCount,
      waitlistCount,
      approvedCount,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return {
      eventId: registration.eventId as string,
      userId: registration.userId as string,
      title: event.title as string,
      promoted,
    };
  });

  await revokeEventAnnouncementAccess(result.eventId, result.userId);

  await createAndSendNotification({
    userId: result.userId,
    title: 'Registration removed',
    body: `The organizer removed your registration for "${result.title}".${input.reason ? ` Reason: ${input.reason}` : ''}`,
    type: 'EVENT_REGISTRATION_REJECTED',
    entityType: COLLECTIONS.EVENTS,
    entityId: result.eventId,
  });
  if (result.promoted) {
    await createAndSendNotification({
      userId: result.promoted.userId,
      title: result.promoted.status === 'APPROVED' ? 'A seat opened up' : 'Moved from the waitlist',
      body: result.promoted.status === 'APPROVED'
        ? `You now have a seat at "${result.title}". Your QR ticket is ready.`
        : `A seat opened at "${result.title}". Your registration is now waiting for organizer approval.`,
      type: 'EVENT_WAITLIST_PROMOTED',
      entityType: COLLECTIONS.EVENTS,
      entityId: result.eventId,
    });
  }
  await writeAuditLog({
    actorUserId: auth.uid,
    action: AUDIT_ACTIONS.EVENT_REGISTRATION_REJECTED,
    entityType: COLLECTIONS.EVENT_REGISTRATIONS,
    entityId: input.registrationId,
    metadata: { reason: input.reason ?? 'Removed by organizer' },
  });
  return { registrationId: input.registrationId, status: 'REJECTED' };
});

async function updateRegistrationApproval(
  registrationId: string,
  auth: { uid: string; role: string; name: string },
  nextStatus: 'APPROVED' | 'REJECTED',
  reason?: string
) {
  const result = await db.runTransaction(async (tx) => {
    const registrationRef = db.collection(COLLECTIONS.EVENT_REGISTRATIONS).doc(registrationId);
    const registrationSnap = await tx.get(registrationRef);
    if (!registrationSnap.exists) throw new HttpsError('not-found', 'Registration not found.');
    const registration = registrationSnap.data()!;
    if (registration.status !== 'PENDING') {
      throw new HttpsError('failed-precondition', 'Only pending registrations can be reviewed.');
    }

    const eventRef = db.collection(COLLECTIONS.EVENTS).doc(registration.eventId as string);
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) throw new HttpsError('not-found', 'Event not found.');
    const event = eventSnap.data()!;
    await assertEventOrganizerOrAdmin(event, auth);

    const nextWaitlisted = nextStatus === 'REJECTED'
      ? await getNextWaitlistedRegistration(tx, registration.eventId as string)
      : null;
    let registrationCount = (event.registrationCount as number) ?? 0;
    let waitlistCount = (event.waitlistCount as number) ?? 0;
    let approvedCount = (event.approvedCount as number) ?? 0;
    let promoted: { userId: string; status: 'APPROVED' | 'PENDING' } | null = null;

    if (nextStatus === 'REJECTED') registrationCount = Math.max(0, registrationCount - 1);
    else approvedCount += 1;

    if (nextWaitlisted) {
      promoted = promoteWaitlistedRegistration(
        tx,
        nextWaitlisted,
        (event.approvalMode as string | undefined) ?? 'MANUAL'
      );
      registrationCount += 1;
      waitlistCount = Math.max(0, waitlistCount - 1);
      approvedCount += promoted.status === 'APPROVED' ? 1 : 0;
    }

    const ticketToken = nextStatus === 'APPROVED' ? makeTicketToken() : null;
    tx.update(registrationRef, {
      status: nextStatus,
      approvalReason: reason ?? null,
      approvedAt: nextStatus === 'APPROVED' ? FieldValue.serverTimestamp() : null,
      rejectedAt: nextStatus === 'REJECTED' ? FieldValue.serverTimestamp() : null,
      ticketToken,
      ticketIssuedAt: nextStatus === 'APPROVED' ? FieldValue.serverTimestamp() : null,
    });
    tx.update(eventRef, {
      registrationCount,
      waitlistCount,
      approvedCount,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { eventId: registration.eventId as string, userId: registration.userId as string, title: event.title as string, promoted };
  });

  if (nextStatus === 'REJECTED') {
    await revokeEventAnnouncementAccess(result.eventId, result.userId);
  }

  await createAndSendNotification({
    userId: result.userId,
    title: nextStatus === 'APPROVED' ? 'Registration approved' : 'Registration not approved',
    body:
      nextStatus === 'APPROVED'
        ? `Your ticket for "${result.title}" is ready.`
        : `Your registration for "${result.title}" was not approved.${reason ? ` Reason: ${reason}` : ''}`,
    type: nextStatus === 'APPROVED' ? 'EVENT_REGISTRATION_APPROVED' : 'EVENT_REGISTRATION_REJECTED',
    entityType: COLLECTIONS.EVENTS,
    entityId: result.eventId,
  });

  if (result.promoted) {
    await createAndSendNotification({
      userId: result.promoted.userId,
      title: result.promoted.status === 'APPROVED' ? 'A seat opened up' : 'Moved from the waitlist',
      body: result.promoted.status === 'APPROVED'
        ? `You now have a seat at "${result.title}". Your QR ticket is ready.`
        : `A seat opened at "${result.title}". Your registration is now waiting for organizer approval.`,
      type: 'EVENT_WAITLIST_PROMOTED',
      entityType: COLLECTIONS.EVENTS,
      entityId: result.eventId,
    });
  }

  await writeAuditLog({
    actorUserId: auth.uid,
    action:
      nextStatus === 'APPROVED'
        ? AUDIT_ACTIONS.EVENT_REGISTRATION_APPROVED
        : AUDIT_ACTIONS.EVENT_REGISTRATION_REJECTED,
    entityType: COLLECTIONS.EVENT_REGISTRATIONS,
    entityId: registrationId,
    ...(reason ? { metadata: { reason } } : {}),
  });
  return { registrationId, status: nextStatus };
}

export const approveAllEventRegistrations = onCall(callableOptions, async (request) => {
  const auth = await assertAuth(request);
  const input = approveAllEventRegistrationsInputSchema.parse(request.data);
  const batchSize = 100;
  const result = await db.runTransaction(async (tx) => {
    const eventRef = db.collection(COLLECTIONS.EVENTS).doc(input.eventId);
    const pendingQuery = db
      .collection(COLLECTIONS.EVENT_REGISTRATIONS)
      .where('eventId', '==', input.eventId)
      .where('status', '==', 'PENDING')
      .limit(batchSize + 1);
    const [eventSnap, pendingSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(pendingQuery),
    ]);

    if (!eventSnap.exists) throw new HttpsError('not-found', 'Event not found.');
    const event = eventSnap.data()!;
    await assertEventOrganizerOrAdmin(event, auth);

    if (pendingSnap.empty) {
      return { approvedCount: 0, hasMore: false, recipients: [], eventTitle: event.title as string };
    }

    const registrationsToApprove = pendingSnap.docs.slice(0, batchSize);
    for (const registration of registrationsToApprove) {
      const userId = registration.data().userId as string;
      tx.update(registration.ref, {
        status: 'APPROVED',
        approvalReason: null,
        approvedAt: FieldValue.serverTimestamp(),
        rejectedAt: null,
        ticketToken: makeTicketToken(),
        ticketIssuedAt: FieldValue.serverTimestamp(),
      });
      tx.set(db.collection(COLLECTIONS.NOTIFICATIONS).doc(), {
        userId,
        title: 'Registration approved',
        body: `Your ticket for "${event.title as string}" is ready.`,
        type: 'EVENT_REGISTRATION_APPROVED',
        entityType: COLLECTIONS.EVENTS,
        entityId: input.eventId,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    tx.update(eventRef, {
      approvedCount: ((event.approvedCount as number) ?? 0) + registrationsToApprove.length,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      approvedCount: registrationsToApprove.length,
      hasMore: pendingSnap.size > batchSize,
      recipients: registrationsToApprove.map((doc) => doc.data().userId as string),
      eventTitle: event.title as string,
    };
  });

  // In-app notifications were committed atomically with the approvals. Native
  // push is best-effort and bounded, so FCM latency cannot corrupt batch progress.
  for (let index = 0; index < result.recipients.length; index += 20) {
    const recipients = result.recipients.slice(index, index + 20);
    await Promise.allSettled(recipients.map((userId) =>
      sendPushToUser(userId, 'Registration approved', `Your ticket for "${result.eventTitle}" is ready.`)
    ));
  }

  await writeAuditLog({
    actorUserId: auth.uid,
    action: AUDIT_ACTIONS.EVENT_REGISTRATION_APPROVED,
    entityType: COLLECTIONS.EVENTS,
    entityId: input.eventId,
    metadata: { approvedCount: result.approvedCount, bulk: true },
  });

  return {
    eventId: input.eventId,
    approvedCount: result.approvedCount,
    hasMore: result.hasMore,
  };
});

export const getEventTicket = onCall(callableOptions, async (request): Promise<EventTicketPayload> => {
  const auth = await assertRole(request, ['STUDENT']);
  const input = getEventTicketInputSchema.parse(request.data);
  return db.runTransaction(async (tx) => {
    const registrationQuery = db
      .collection(COLLECTIONS.EVENT_REGISTRATIONS)
      .where('eventId', '==', input.eventId)
      .where('userId', '==', auth.uid)
      .limit(5);
    const eventRef = db.collection(COLLECTIONS.EVENTS).doc(input.eventId);
    const [registrationQuerySnap, eventSnap] = await Promise.all([
      tx.get(registrationQuery),
      tx.get(eventRef),
    ]);

    const registration = registrationQuerySnap.docs.find((doc) =>
      isApprovedRegistration(doc.data().status)
    );
    if (!registration) {
      throw new HttpsError('failed-precondition', 'An approved registration is required for a ticket.');
    }
    if (!eventSnap.exists) {
      throw new HttpsError('not-found', 'Event not found.');
    }

    let ticketToken = registration.data().ticketToken as string | null | undefined;
    if (!ticketToken) {
      ticketToken = makeTicketToken();
      tx.update(registration.ref, {
        ticketToken,
        ticketIssuedAt: FieldValue.serverTimestamp(),
      });
    }

    return {
      registrationId: registration.id,
      eventId: input.eventId,
      eventTitle: eventSnap.data()!.title as string,
      qrValue: buildTicketQrValue(registration.id, ticketToken),
    };
  });
});

export const checkInEventAttendee = onCall(
  callableOptions,
  async (request): Promise<EventCheckInResult> => {
    const auth = await assertAuth(request);
    const input = checkInEventAttendeeInputSchema.parse(request.data);
    return db.runTransaction(async (tx) => {
      const registrationRef = db.collection(COLLECTIONS.EVENT_REGISTRATIONS).doc(input.registrationId);
      const registrationSnap = await tx.get(registrationRef);
      if (!registrationSnap.exists) return { status: 'INVALID' };
      const registration = registrationSnap.data()!;
      const eventRef = db.collection(COLLECTIONS.EVENTS).doc(registration.eventId as string);
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists) return { status: 'INVALID' };
      const event = eventSnap.data()!;
      await assertEventOrganizerOrAdmin(event, auth);
      if (registration.ticketToken !== input.ticketToken || !isApprovedRegistration(registration.status)) {
        return { status: 'INVALID' };
      }
      if (registration.status === 'ATTENDED') {
        return {
          status: 'ALREADY_CHECKED_IN',
          registrationId: registrationSnap.id,
          studentName: registration.studentName as string,
          registerNumber: registration.registerNumber as string,
          eventTitle: event.title as string,
        };
      }
      tx.update(registrationRef, {
        status: 'ATTENDED',
        attendedAt: FieldValue.serverTimestamp(),
        checkedInByUserId: auth.uid,
      });
      return {
        status: 'VALID',
        registrationId: registrationSnap.id,
        studentName: registration.studentName as string,
        registerNumber: registration.registerNumber as string,
        eventTitle: event.title as string,
        checkedInAt: new Date().toISOString(),
      };
    });
  }
);
