import { useMutation, useQueryClient } from '@tanstack/react-query';

import { markNotificationRead } from '@/src/lib/notificationsApi';

export function useMarkNotificationRead(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        queryClient.invalidateQueries({ queryKey: ['notificationsUnread', userId] });
      }
    },
  });
}
