import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WorkPostWithId } from '@campusflow/shared';

import {
  archiveWorkPost,
  createWorkPost,
  fetchActiveWorkPosts,
  fetchMyActiveWorkPost,
  toggleWorkPostHype,
  updateWorkPost,
  type CreateWorkPostInput,
  type UpdateWorkPostInput,
  type WorkPostAuthorContext,
  type WorkPostFilter,
} from '@/src/lib/workPosts';

export function useWorkPosts(filter: WorkPostFilter, departmentId?: string) {
  return useQuery({
    queryKey: ['workPosts', filter, departmentId ?? 'all'],
    queryFn: () => fetchActiveWorkPosts(filter, departmentId),
    refetchOnMount: 'always',
  });
}

export function useMyActiveWorkPost(studentUserId: string | undefined) {
  return useQuery({
    queryKey: ['myWorkPost', studentUserId],
    queryFn: () => fetchMyActiveWorkPost(studentUserId!),
    enabled: Boolean(studentUserId),
  });
}

function patchWorkPostHype(
  posts: WorkPostWithId[] | undefined,
  postId: string,
  userId: string,
  currentlyHyped: boolean
): WorkPostWithId[] | undefined {
  if (!posts) return posts;

  return posts.map((post) => {
    if (post.id !== postId) return post;
    const liked = post.likedByUserIds ?? [];
    return {
      ...post,
      likedByUserIds: currentlyHyped
        ? liked.filter((id) => id !== userId)
        : [...liked, userId],
    };
  });
}

export function useWorkPostMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['workPosts'] });
    queryClient.invalidateQueries({ queryKey: ['myWorkPost'] });
  };

  const create = useMutation({
    mutationFn: ({
      author,
      input,
    }: {
      author: WorkPostAuthorContext;
      input: CreateWorkPostInput;
    }) => createWorkPost(author, input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: (input: UpdateWorkPostInput) => updateWorkPost(input),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: (postId: string) => archiveWorkPost(postId),
    onSuccess: invalidate,
  });

  const toggleHype = useMutation({
    mutationFn: ({
      postId,
      userId,
      currentlyHyped,
    }: {
      postId: string;
      userId: string;
      currentlyHyped: boolean;
    }) => toggleWorkPostHype(postId, userId, currentlyHyped),
    onMutate: async ({ postId, userId, currentlyHyped }) => {
      await queryClient.cancelQueries({ queryKey: ['workPosts'] });
      await queryClient.cancelQueries({ queryKey: ['myWorkPost'] });

      const previousWorkPosts = queryClient.getQueriesData<WorkPostWithId[]>({
        queryKey: ['workPosts'],
      });
      const previousMyPost = queryClient.getQueryData<WorkPostWithId | null>(['myWorkPost', userId]);

      queryClient.setQueriesData<WorkPostWithId[]>({ queryKey: ['workPosts'] }, (old) =>
        patchWorkPostHype(old, postId, userId, currentlyHyped)
      );

      if (previousMyPost?.id === postId) {
        queryClient.setQueryData<WorkPostWithId | null>(['myWorkPost', userId], (old) =>
          old ? patchWorkPostHype([old], postId, userId, currentlyHyped)?.[0] ?? old : old
        );
      }

      return { previousWorkPosts, previousMyPost, userId };
    },
    onError: (_error, _variables, context) => {
      context?.previousWorkPosts.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousMyPost !== undefined) {
        queryClient.setQueryData(['myWorkPost', context.userId], context.previousMyPost);
      }
    },
    onSettled: invalidate,
  });

  return { create, update, archive, toggleHype };
}
