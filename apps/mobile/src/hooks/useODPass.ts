import { useQuery } from '@tanstack/react-query';

import { fetchODPassQrPayload } from '@/src/lib/odPass';

export function useODPassQrPayload(requestId: string | undefined) {
  return useQuery({
    queryKey: ['odPassQr', requestId],
    queryFn: () => fetchODPassQrPayload(requestId!),
    enabled: !!requestId,
    staleTime: 60_000,
  });
}
