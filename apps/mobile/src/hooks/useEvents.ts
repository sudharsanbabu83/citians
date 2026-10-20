import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EventType } from '@campusflow/shared';

import {
  fetchEventById,
  fetchEventRegistrations,
  fetchMyEventRegistrations,
  fetchMyEvents,
  fetchPublishedEvents,
  fetchUserRegistrationForEvent,
} from '@/src/lib/events';
import {
  cancelEvent,
  createEvent,
  registerForEvent,
  unregisterFromEvent,
  approveAllEventRegistrations,
  approveEventRegistration,
  rejectEventRegistration,
  removeEventAttendee,
  type RegisterForEventInput,
  type CreateEventFormInput,
} from '@/src/lib/eventsApi';

export function useEvents(typeFilter: EventType | 'ALL' = 'ALL') {
  return useQuery({
    queryKey: ['events', typeFilter],
    queryFn: () => fetchPublishedEvents(typeFilter),
    staleTime: 120_000,
    placeholderData: (previous) => previous,
  });
}

export function useEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId,
  });
}

export function useMyEvents(userId: string | undefined) {
  return useQuery({
    queryKey: ['myEvents', userId],
    queryFn: () => fetchMyEvents(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useMyEventRegistrations(userId: string | undefined) {
  return useQuery({
    queryKey: ['myEventRegistrations', userId],
    queryFn: () => fetchMyEventRegistrations(userId!),
    enabled: !!userId,
    staleTime: 120_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    placeholderData: (previous) => previous,
  });
}

export function useEventRegistration(userId: string | undefined, eventId: string | undefined) {
  return useQuery({
    queryKey: ['eventRegistration', userId, eventId],
    queryFn: () => fetchUserRegistrationForEvent(userId!, eventId!),
    enabled: !!userId && !!eventId,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
}

export function useEventRegistrations(eventId: string | undefined) {
  return useQuery({
    queryKey: ['eventRegistrations', eventId],
    queryFn: () => fetchEventRegistrations(eventId!),
    enabled: !!eventId,
    staleTime: 15_000,
  });
}

export function useEventMutations() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['event'] });
    queryClient.invalidateQueries({ queryKey: ['myEvents'] });
    queryClient.invalidateQueries({ queryKey: ['myEventRegistrations'] });
    queryClient.invalidateQueries({ queryKey: ['eventRegistration'] });
    queryClient.invalidateQueries({ queryKey: ['eventRegistrations'] });
    queryClient.invalidateQueries({ queryKey: ['eventTicket'] });
  };

  const create = useMutation({
    mutationFn: (input: CreateEventFormInput) => createEvent(input),
    onSuccess: invalidateAll,
  });

  const register = useMutation({
    mutationFn: (input: RegisterForEventInput) => registerForEvent(input),
    onSuccess: invalidateAll,
  });

  const unregister = useMutation({
    mutationFn: (eventId: string) => unregisterFromEvent(eventId),
    onSuccess: invalidateAll,
  });

  const cancel = useMutation({
    mutationFn: ({ eventId, reason }: { eventId: string; reason?: string }) =>
      cancelEvent(eventId, reason),
    onSuccess: invalidateAll,
  });

  const approveRegistration = useMutation({
    mutationFn: (registrationId: string) => approveEventRegistration(registrationId),
    onSuccess: invalidateAll,
  });

  const rejectRegistration = useMutation({
    mutationFn: ({ registrationId, reason }: { registrationId: string; reason?: string }) =>
      rejectEventRegistration(registrationId, reason),
    onSuccess: invalidateAll,
  });

  const approveAll = useMutation({
    mutationFn: (eventId: string) => approveAllEventRegistrations(eventId),
    onSuccess: invalidateAll,
  });

  const removeAttendee = useMutation({
    mutationFn: ({ registrationId, reason }: { registrationId: string; reason?: string }) =>
      removeEventAttendee(registrationId, reason),
    onSuccess: invalidateAll,
  });

  return { create, register, unregister, cancel, approveRegistration, rejectRegistration, approveAll, removeAttendee };
}
