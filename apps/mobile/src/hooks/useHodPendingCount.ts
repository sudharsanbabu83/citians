import { useQuery } from '@tanstack/react-query';

import { fetchHodPendingCount } from '@/src/lib/odRequests';

export function useHodPendingCount(departmentId: string | undefined) {
  return useQuery({
    queryKey: ['hodPendingCount', departmentId],
    queryFn: () => fetchHodPendingCount(departmentId!),
    enabled: !!departmentId,
    staleTime: 30_000,
    refetchOnMount: 'always',
  });
}
