import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  acknowledgeEventAnnouncement,
  publishEventAnnouncement,
  subscribeToEventAnnouncements,
  type AnnouncementItem,
  type PublishEventAnnouncementInput,
} from '@/src/lib/eventAnnouncements';

export function useEventAnnouncements(eventId?: string, userId?: string, isHost = false) {
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (!eventId || !userId) { setIsLoading(false); return; }
    setIsLoading(true);
    return subscribeToEventAnnouncements(eventId, userId, isHost, (next) => {
      setItems(next); setIsLoading(false); setError(null);
    }, (nextError) => { setError(nextError); setIsLoading(false); });
  }, [eventId, userId, isHost]);
  return { items, isLoading, error };
}

export function useEventAnnouncementMutations() {
  const queryClient = useQueryClient();
  const publish = useMutation({
    mutationFn: (input: Omit<PublishEventAnnouncementInput, 'requestId'> & { requestId?: string }) => publishEventAnnouncement(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const acknowledge = useMutation({ mutationFn: acknowledgeEventAnnouncement });
  return { publish, acknowledge };
}
