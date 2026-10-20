import {
  cancelCompetitionInputSchema,
  createCompetitionInputSchema,
  updateCompetitionInputSchema,
} from '@campusflow/shared';
import type { CreateCompetitionResult } from '@campusflow/shared';
import { z } from 'zod';

import {
  cancelCompetitionCallable,
  createCompetitionCallable,
  updateCompetitionCallable,
} from '@/src/config/firebase';
import { monitorOperation } from '@/src/lib/telemetry';

export type CreateCompetitionInput = z.infer<typeof createCompetitionInputSchema>;
export type UpdateCompetitionInput = z.infer<typeof updateCompetitionInputSchema>;
export type CancelCompetitionInput = z.infer<typeof cancelCompetitionInputSchema>;

export async function createCompetition(
  input: CreateCompetitionInput
): Promise<CreateCompetitionResult> {
  return monitorOperation('COMPETITIONS', 'create_competition', async () => {
    const payload = createCompetitionInputSchema.parse(input);
    return (await createCompetitionCallable(payload)).data;
  });
}

export async function updateCompetition(
  input: UpdateCompetitionInput
): Promise<{ competitionId: string; status: string }> {
  return monitorOperation('COMPETITIONS', 'update_competition', async () => {
    const payload = updateCompetitionInputSchema.parse(input);
    return (await updateCompetitionCallable(payload)).data;
  }, { competitionId: input.competitionId });
}

export async function cancelCompetition(
  input: CancelCompetitionInput
): Promise<{ competitionId: string; status: string }> {
  return monitorOperation('COMPETITIONS', 'cancel_competition', async () => {
    const payload = cancelCompetitionInputSchema.parse(input);
    return (await cancelCompetitionCallable(payload)).data;
  }, { competitionId: input.competitionId });
}
