import { useQuery } from '@tanstack/react-query';

import { fetchUnreadNotificationCount, fetchUserNotifications } from '@/src/lib/notifications';

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => fetchUserNotifications(userId!),
    enabled: !!userId,
    refetchInterval: 30_000,
  });
}

export function useUnreadNotificationCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['notificationsUnread', userId],
    queryFn: () => fetchUnreadNotificationCount(userId!),
    enabled: !!userId,
    refetchInterval: 30_000,
  });
}
