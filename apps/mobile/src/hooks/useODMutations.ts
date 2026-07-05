import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ODRequest } from '@campusflow/shared';

import {
  createDraftRequest,
  submitODRequest,
  updateDraftRequest,
  type DraftRequestInput,
  type ODFormInput,
} from '@/src/lib/odApi';
import { useAuthStore } from '@/src/lib/authStore';

function invalidateODQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  studentUserId: string,
  requestId?: string
) {
  queryClient.invalidateQueries({ queryKey: ['studentDashboard', studentUserId] });
  if (requestId) {
    queryClient.invalidateQueries({ queryKey: ['odRequest', requestId] });
    queryClient.invalidateQueries({ queryKey: ['odDocuments', requestId] });
  }
}

export function useCreateDraft() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (input: DraftRequestInput) => createDraftRequest(input),
    onSuccess: (_id) => {
      if (user?.uid) {
        invalidateODQueries(queryClient, user.uid);
      }
    },
  });
}

export function useUpdateDraft() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({
      requestId,
      input,
      currentStatus,
    }: {
      requestId: string;
      input: Omit<DraftRequestInput, 'studentUserId' | 'departmentId' | 'hodUserId'>;
      currentStatus: ODRequest['status'];
    }) => updateDraftRequest(requestId, input, currentStatus),
    onSuccess: (_data, variables) => {
      if (user?.uid) {
        invalidateODQueries(queryClient, user.uid, variables.requestId);
      }
    },
  });
}

export function useSubmitODRequest() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const departmentId = useAuthStore((s) =>
    s.roleProfile?.type === 'STUDENT' ? s.roleProfile.data.departmentId : undefined
  );

  return useMutation({
    mutationFn: (input: ODFormInput) => submitODRequest(input),
    onSuccess: (result) => {
      if (user?.uid) {
        invalidateODQueries(queryClient, user.uid, result.requestId);
        queryClient.invalidateQueries({ queryKey: ['notifications', user.uid] });
        queryClient.invalidateQueries({ queryKey: ['notificationsUnread', user.uid] });
      }
      if (departmentId) {
        queryClient.invalidateQueries({ queryKey: ['hodPendingCount', departmentId] });
        queryClient.invalidateQueries({ queryKey: ['hodPendingRequests', departmentId] });
      }
    },
  });
}
