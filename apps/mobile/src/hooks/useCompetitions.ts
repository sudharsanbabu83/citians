import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CompetitionPlatform } from '@campusflow/shared';

import {
  cancelCompetition,
  createCompetition,
  updateCompetition,
  type CancelCompetitionInput,
  type CreateCompetitionInput,
  type UpdateCompetitionInput,
} from '@/src/lib/competitionsApi';
import {
  fetchAdminCompetitions,
  fetchCompetitionById,
  fetchPublishedCompetitions,
} from '@/src/lib/competitions';

export function usePublishedCompetitions(platform?: CompetitionPlatform | 'ALL') {
  return useQuery({
    queryKey: ['competitions', 'published', platform ?? 'ALL'],
    queryFn: () => fetchPublishedCompetitions(platform),
    staleTime: 30_000,
    refetchOnMount: 'always',
  });
}

export function useCompetition(competitionId: string | undefined) {
  return useQuery({
    queryKey: ['competition', competitionId],
    queryFn: () => fetchCompetitionById(competitionId!),
    enabled: !!competitionId,
  });
}

export function useAdminCompetitions(userId: string | undefined) {
  return useQuery({
    queryKey: ['competitions', 'admin', userId],
    queryFn: () => fetchAdminCompetitions(userId!),
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnMount: 'always',
  });
}

export function useCompetitionMutations(adminUserId?: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['competitions'] });
    if (adminUserId) {
      queryClient.invalidateQueries({ queryKey: ['competitions', 'admin', adminUserId] });
    }
  };

  const create = useMutation({
    mutationFn: (input: CreateCompetitionInput) => createCompetition(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: (input: UpdateCompetitionInput) => updateCompetition(input),
    onSuccess: (_, variables) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['competition', variables.competitionId] });
    },
  });

  const cancel = useMutation({
    mutationFn: (input: CancelCompetitionInput) => cancelCompetition(input),
    onSuccess: (_, variables) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['competition', variables.competitionId] });
    },
  });

  return { create, update, cancel };
}
