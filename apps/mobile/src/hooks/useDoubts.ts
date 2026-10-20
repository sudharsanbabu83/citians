import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addDoubtBranch,
  createDoubt,
  fetchDoubt,
  fetchDoubtBranches,
  fetchDoubts,
  toggleBranchHelpful,
  toggleSessionSupport,
  type DoubtAuthorContext,
  type DoubtFilter,
} from '@/src/lib/doubts';

export function useDoubts(filter: DoubtFilter, departmentId?: string) {
  return useQuery({
    queryKey: ['doubts', filter, departmentId ?? 'all'],
    queryFn: () => fetchDoubts(filter, departmentId),
    refetchOnMount: 'always',
  });
}

export function useDoubt(id: string) {
  return useQuery({ queryKey: ['doubt', id], queryFn: () => fetchDoubt(id), enabled: Boolean(id) });
}

export function useDoubtBranches(id: string) {
  return useQuery({ queryKey: ['doubtBranches', id], queryFn: () => fetchDoubtBranches(id), enabled: Boolean(id) });
}

export function useDoubtMutations() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['doubts'] });
  const create = useMutation({
    mutationFn: ({ author, input }: { author: DoubtAuthorContext; input: Parameters<typeof createDoubt>[1] }) => createDoubt(author, input),
    onSuccess: refresh,
  });
  const addBranch = useMutation({
    mutationFn: (input: Parameters<typeof addDoubtBranch>) => addDoubtBranch(...input),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ['doubt', variables[0]] });
      client.invalidateQueries({ queryKey: ['doubtBranches', variables[0]] });
      refresh();
    },
  });
  const helpful = useMutation({
    mutationFn: (input: Parameters<typeof toggleBranchHelpful>) => toggleBranchHelpful(...input),
    onSuccess: refresh,
  });
  const session = useMutation({
    mutationFn: (input: Parameters<typeof toggleSessionSupport>) => toggleSessionSupport(...input),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ['doubt', variables[0]] });
      refresh();
    },
  });
  return { create, addBranch, helpful, session };
}
