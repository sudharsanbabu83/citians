import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  AUDIT_ACTIONS,
  COLLECTIONS,
  cancelCompetitionInputSchema,
  createCompetitionInputSchema,
  updateCompetitionInputSchema,
} from '@campusflow/shared';
import type { CreateCompetitionResult } from '@campusflow/shared';
import { assertRole } from '../utils/auth';
import { callableOptions } from '../utils/callableOptions';
import { writeAuditLog } from '../utils/audit';
import { db } from '../utils/firebase';

function toTimestamp(iso: string): Timestamp {
  return Timestamp.fromDate(new Date(iso));
}

async function getCompetitionOrThrow(competitionId: string) {
  const snap = await db.collection(COLLECTIONS.COMPETITIONS).doc(competitionId).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Competition not found.');
  }
  return { id: snap.id, ref: snap.ref, data: snap.data()! };
}

export const createCompetition = onCall(
  callableOptions,
  async (request): Promise<CreateCompetitionResult> => {
    const auth = await assertRole(request, ['COMPETITIONS_ADMIN']);
    const input = createCompetitionInputSchema.parse(request.data);

    const ref = db.collection(COLLECTIONS.COMPETITIONS).doc();
    const status = input.publish === false ? 'DRAFT' : 'PUBLISHED';

    await ref.set({
      title: input.title,
      description: input.description,
      platform: input.platform,
      platformLabel: input.platformLabel ?? null,
      registrationUrl: input.registrationUrl,
      mode: input.mode,
      venue: input.venue ?? null,
      startAt: toTimestamp(input.startAt),
      endAt: toTimestamp(input.endAt),
      registrationDeadline: toTimestamp(input.registrationDeadline),
      prizePool: input.prizePool ?? null,
      teamSize: input.teamSize ?? null,
      tags: input.tags ?? [],
      status,
      createdByUserId: auth.uid,
      createdByName: auth.name,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      actorUserId: auth.uid,
      action: AUDIT_ACTIONS.COMPETITION_CREATED,
      entityType: COLLECTIONS.COMPETITIONS,
      entityId: ref.id,
      metadata: { title: input.title, platform: input.platform, status },
    });

    return { competitionId: ref.id, status };
  }
);

export const updateCompetition = onCall(callableOptions, async (request) => {
  const auth = await assertRole(request, ['COMPETITIONS_ADMIN']);
  const input = updateCompetitionInputSchema.parse(request.data);
  const { id, ref, data } = await getCompetitionOrThrow(input.competitionId);

  if (data.status === 'CANCELLED') {
    throw new HttpsError('failed-precondition', 'Cancelled competitions cannot be updated.');
  }

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.platform !== undefined) updates.platform = input.platform;
  if (input.platformLabel !== undefined) updates.platformLabel = input.platformLabel;
  if (input.registrationUrl !== undefined) updates.registrationUrl = input.registrationUrl;
  if (input.mode !== undefined) updates.mode = input.mode;
  if (input.venue !== undefined) updates.venue = input.venue;
  if (input.prizePool !== undefined) updates.prizePool = input.prizePool;
  if (input.teamSize !== undefined) updates.teamSize = input.teamSize;
  if (input.tags !== undefined) updates.tags = input.tags;
  if (input.startAt !== undefined) updates.startAt = toTimestamp(input.startAt);
  if (input.endAt !== undefined) updates.endAt = toTimestamp(input.endAt);
  if (input.registrationDeadline !== undefined) {
    updates.registrationDeadline = toTimestamp(input.registrationDeadline);
  }
  if (input.publish === true && data.status === 'DRAFT') {
    updates.status = 'PUBLISHED';
  }

  await ref.update(updates);

  await writeAuditLog({
    actorUserId: auth.uid,
    action: AUDIT_ACTIONS.COMPETITION_UPDATED,
    entityType: COLLECTIONS.COMPETITIONS,
    entityId: id,
    metadata: { fields: Object.keys(updates).filter((key) => key !== 'updatedAt') },
  });

  return {
    competitionId: id,
    status: (updates.status as string | undefined) ?? (data.status as string),
  };
});

export const cancelCompetition = onCall(callableOptions, async (request) => {
  const auth = await assertRole(request, ['COMPETITIONS_ADMIN']);
  const input = cancelCompetitionInputSchema.parse(request.data);
  const { id, ref, data } = await getCompetitionOrThrow(input.competitionId);

  if (data.status === 'CANCELLED') {
    throw new HttpsError('failed-precondition', 'Competition is already cancelled.');
  }

  await ref.update({
    status: 'CANCELLED',
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAuditLog({
    actorUserId: auth.uid,
    action: AUDIT_ACTIONS.COMPETITION_CANCELLED,
    entityType: COLLECTIONS.COMPETITIONS,
    entityId: id,
    metadata: { reason: input.reason ?? null },
  });

  return { competitionId: id, status: 'CANCELLED' };
});
