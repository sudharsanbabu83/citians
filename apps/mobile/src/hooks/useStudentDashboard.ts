import { useQuery } from '@tanstack/react-query';

import {
  computeStudentODStats,
  fetchStudentODRequests,
  type ODRequestWithId,
  type StudentODStats,
} from '@/src/lib/odRequests';

export interface StudentDashboardData {
  requests: ODRequestWithId[];
  stats: StudentODStats;
}

export function useStudentDashboard(studentUserId: string | undefined) {
  return useQuery({
    queryKey: ['studentDashboard', studentUserId],
    queryFn: async (): Promise<StudentDashboardData> => {
      const requests = await fetchStudentODRequests(studentUserId!, 10);
      return {
        requests,
        stats: computeStudentODStats(requests),
      };
    },
    enabled: !!studentUserId,
    staleTime: 30_000,
  });
}
