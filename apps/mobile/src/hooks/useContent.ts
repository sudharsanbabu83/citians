import { useQuery } from '@tanstack/react-query';

import { fetchPublishedOpeningSpotlights, fetchPublishedSparks, fetchPublishedTechUpdates } from '@/src/lib/content';

export function usePublishedTechUpdates() {
  return useQuery({ queryKey: ['content', 'techPulse'], queryFn: fetchPublishedTechUpdates, staleTime: 120_000 });
}

export function usePublishedSparks() {
  return useQuery({ queryKey: ['content', 'dailySparks'], queryFn: fetchPublishedSparks, staleTime: 120_000 });
}

export function usePublishedOpeningSpotlights() {
  return useQuery({ queryKey: ['content', 'openingSpotlights'], queryFn: fetchPublishedOpeningSpotlights, staleTime: 60_000 });
}
