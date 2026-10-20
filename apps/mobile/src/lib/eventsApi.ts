import {
  cancelEventInputSchema,
  createEventInputSchema,
  registerForEventInputSchema,
  approveEventRegistrationInputSchema,
  rejectEventRegistrationInputSchema,
  removeEventAttendeeInputSchema,
  approveAllEventRegistrationsInputSchema,
  getEventTicketInputSchema,
  checkInEventAttendeeInputSchema,
  unregisterFromEventInputSchema,
} from '@campusflow/shared';
import type { CreateEventResult, EventCheckInResult, EventTicketPayload, RegisterForEventResult } from '@campusflow/shared';
import { z } from 'zod';

import {
  cancelEventCallable,
  createEventCallable,
  registerForEventCallable,
  unregisterFromEventCallable,
  approveEventRegistrationCallable,
  rejectEventRegistrationCallable,
  removeEventAttendeeCallable,
  approveAllEventRegistrationsCallable,
  getEventTicketCallable,
  checkInEventAttendeeCallable,
} from '@/src/config/firebase';
import { monitorOperation } from '@/src/lib/telemetry';

export type CreateEventFormInput = z.infer<typeof createEventInputSchema>;

export async function createEvent(input: CreateEventFormInput): Promise<CreateEventResult> {
  return monitorOperation('EVENTS', 'create_event', async () => {
    const validated = createEventInputSchema.parse(input);
    return (await createEventCallable(validated)).data;
  });
}

export async function cancelEvent(eventId: string, reason?: string): Promise<void> {
  await monitorOperation('EVENTS', 'cancel_event', async () => {
    const validated = cancelEventInputSchema.parse({ eventId, reason });
    await cancelEventCallable(validated);
  }, { eventId });
}

export type RegisterForEventInput = z.infer<typeof registerForEventInputSchema>;

export async function registerForEvent(input: RegisterForEventInput): Promise<RegisterForEventResult> {
  return monitorOperation('EVENT_REGISTRATION', 'register_for_event', async () => {
    const validated = registerForEventInputSchema.parse(input);
    return (await registerForEventCallable(validated)).data;
  }, { eventId: input.eventId });
}

export async function removeEventAttendee(registrationId: string, reason?: string): Promise<void> {
  await removeEventAttendeeCallable(removeEventAttendeeInputSchema.parse({ registrationId, reason }));
}

export async function unregisterFromEvent(eventId: string): Promise<void> {
  const validated = unregisterFromEventInputSchema.parse({ eventId });
  await unregisterFromEventCallable(validated);
}

export async function approveEventRegistration(registrationId: string): Promise<void> {
  await approveEventRegistrationCallable(approveEventRegistrationInputSchema.parse({ registrationId }));
}

export async function rejectEventRegistration(registrationId: string, reason?: string): Promise<void> {
  await rejectEventRegistrationCallable(rejectEventRegistrationInputSchema.parse({ registrationId, reason }));
}

export async function approveAllEventRegistrations(eventId: string): Promise<number> {
  return monitorOperation('EVENT_REGISTRATION', 'approve_all_registrations', async () => {
    const payload = approveAllEventRegistrationsInputSchema.parse({ eventId });
    let approvedCount = 0;
    let hasMore = true;
    let batches = 0;

    while (hasMore) {
      const result = await approveAllEventRegistrationsCallable(payload);
      approvedCount += result.data.approvedCount;
      hasMore = result.data.hasMore;
      batches += 1;
      if (batches >= 100) {
        throw new Error('Bulk approval paused after 10,000 registrations. Run it again to continue.');
      }
    }
    return approvedCount;
  }, { eventId });
}

export async function getEventTicket(eventId: string): Promise<EventTicketPayload> {
  return monitorOperation('EVENT_TICKET', 'get_event_ticket', async () => {
    return (await getEventTicketCallable(getEventTicketInputSchema.parse({ eventId }))).data;
  }, { eventId });
}

export async function checkInEventAttendee(
  registrationId: string,
  ticketToken: string
): Promise<EventCheckInResult> {
  const result = await checkInEventAttendeeCallable(
    checkInEventAttendeeInputSchema.parse({ registrationId, ticketToken })
  );
  return result.data;
}
