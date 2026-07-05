import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  approveODRequest,
  rejectODRequest,
  requestODChanges,
  type ApproveInput,
  type RejectInput,
  type RequestChangesInput,
} from '@/src/lib/hodApi';

function invalidateAfterReview(
  queryClient: ReturnType<typeof useQueryClient>,
  departmentId: string | undefined,
  requestId: string,
  studentUserId: string
) {
  if (departmentId) {
    queryClient.invalidateQueries({ queryKey: ['hodPendingCount', departmentId] });
    queryClient.invalidateQueries({ queryKey: ['hodPendingRequests', departmentId] });
  }
  queryClient.invalidateQueries({ queryKey: ['odRequest', requestId] });
  queryClient.invalidateQueries({ queryKey: ['odDocuments', requestId] });
  queryClient.invalidateQueries({ queryKey: ['studentDashboard', studentUserId] });
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
  queryClient.invalidateQueries({ queryKey: ['notificationsUnread'] });
}

export function useApproveODRequest(departmentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApproveInput) => approveODRequest(input),
    onSuccess: (result) => {
      invalidateAfterReview(
        queryClient,
        departmentId,
        result.requestId,
        result.studentUserId
      );
    },
  });
}

export function useRejectODRequest(departmentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RejectInput) => rejectODRequest(input),
    onSuccess: (result) => {
      invalidateAfterReview(
        queryClient,
        departmentId,
        result.requestId,
        result.studentUserId
      );
    },
  });
}

export function useRequestODChanges(departmentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RequestChangesInput) => requestODChanges(input),
    onSuccess: (result) => {
      invalidateAfterReview(
        queryClient,
        departmentId,
        result.requestId,
        result.studentUserId
      );
    },
  });
}

export function mapHodReviewError(error: unknown): string {
  const code = (error as { code?: string }).code;
  const message = (error as Error).message;
  if (code === 'functions/permission-denied') return 'You cannot review this request.';
  if (code === 'functions/failed-precondition') return message || 'This request cannot be reviewed.';
  if (code === 'functions/not-found') return 'Request not found.';
  if (code === 'functions/invalid-argument') return message || 'Please check your input.';
  return message || 'Something went wrong. Please try again.';
}
