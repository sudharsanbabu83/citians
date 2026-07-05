import { useQuery } from '@tanstack/react-query';

import { fetchHodPendingRequests } from '@/src/lib/odRequests';

export function useHodPendingRequests(departmentId: string | undefined) {
  return useQuery({
    queryKey: ['hodPendingRequests', departmentId],
    queryFn: () => fetchHodPendingRequests(departmentId!),
    enabled: !!departmentId,
    staleTime: 30_000,
    refetchOnMount: 'always',
  });
}
