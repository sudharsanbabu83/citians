import {
  approveODRequestInputSchema,
  rejectODRequestInputSchema,
  requestODChangesInputSchema,
} from '@campusflow/shared';
import { z } from 'zod';

import {
  approveODRequestCallable,
  rejectODRequestCallable,
  requestODChangesCallable,
  type HodReviewResult,
} from '@/src/config/firebase';

export type ApproveInput = z.infer<typeof approveODRequestInputSchema>;
export type RejectInput = z.infer<typeof rejectODRequestInputSchema>;
export type RequestChangesInput = z.infer<typeof requestODChangesInputSchema>;

export async function approveODRequest(input: ApproveInput): Promise<HodReviewResult> {
  const validated = approveODRequestInputSchema.parse(input);
  const result = await approveODRequestCallable(validated);
  return result.data;
}

export async function rejectODRequest(input: RejectInput): Promise<HodReviewResult> {
  const validated = rejectODRequestInputSchema.parse(input);
  const result = await rejectODRequestCallable(validated);
  return result.data;
}

export async function requestODChanges(input: RequestChangesInput): Promise<HodReviewResult> {
  const validated = requestODChangesInputSchema.parse(input);
  const result = await requestODChangesCallable(validated);
  return result.data;
}
