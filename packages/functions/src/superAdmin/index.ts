import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { AUDIT_ACTIONS, COLLECTIONS } from '@campusflow/shared';

import { assertRole } from '../utils/auth';
import { writeAuditLog } from '../utils/audit';
import { callableOptions } from '../utils/callableOptions';
import { auth, db } from '../utils/firebase';

const accountStatusSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean(),
  reason: z.string().trim().min(3).max(500),
});

const workPostModerationSchema = z.object({
  postId: z.string().min(1),
  action: z.enum(['REMOVE', 'RESTORE']),
  reason: z.string().trim().min(3).max(500),
});

const canvasDropModerationSchema = z.object({
  roomId: z.string().min(1),
  dropId: z.string().min(1),
  reason: z.string().trim().min(3).max(500),
});

const officialPostSchema = z.object({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(500),
  category: z.enum(['AI_ML', 'WEB', 'MOBILE', 'OPEN_SOURCE', 'RESEARCH', 'DESIGN', 'OTHER']),
});

/** Disable or restore an account in both Firebase Auth and its app profile. */
export const setUserAccountStatus = onCall(callableOptions, async (request) => {
  const actor = await assertRole(request, ['SUPER_ADMIN']);
  const parsed = accountStatusSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message);

  const input = parsed.data;
  if (input.userId === actor.uid) {
    throw new HttpsError('failed-precondition', 'You cannot change your own Super Admin access.');
  }

  const targetRef = db.collection(COLLECTIONS.USERS).doc(input.userId);
  const target = await targetRef.get();
  if (!target.exists) throw new HttpsError('not-found', 'User not found.');
  if (target.data()?.role === 'SUPER_ADMIN') {
    throw new HttpsError('permission-denied', 'Super Admin accounts cannot be changed here.');
  }

  await auth.updateUser(input.userId, { disabled: !input.isActive });
  if (!input.isActive) await auth.revokeRefreshTokens(input.userId);
  await targetRef.update({
    isActive: input.isActive,
    accountActionReason: input.reason,
    accountActionBy: actor.uid,
    accountActionAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await writeAuditLog({
    actorUserId: actor.uid,
    action: AUDIT_ACTIONS.USER_ACCOUNT_STATUS_CHANGED,
    entityType: 'user',
    entityId: input.userId,
    metadata: { isActive: input.isActive, reason: input.reason },
  });
  return { userId: input.userId, isActive: input.isActive };
});

/** Remove an inappropriate Build post without permanently destroying evidence, or restore it. */
export const moderateWorkPost = onCall(callableOptions, async (request) => {
  const actor = await assertRole(request, ['SUPER_ADMIN']);
  const parsed = workPostModerationSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message);

  const input = parsed.data;
  const postRef = db.collection(COLLECTIONS.WORK_POSTS).doc(input.postId);
  const post = await postRef.get();
  if (!post.exists) throw new HttpsError('not-found', 'Post not found.');

  await postRef.update({
    isActive: input.action === 'RESTORE',
    moderation: {
      action: input.action,
      reason: input.reason,
      moderatedBy: actor.uid,
      moderatedAt: FieldValue.serverTimestamp(),
    },
    updatedAt: FieldValue.serverTimestamp(),
  });
  await writeAuditLog({
    actorUserId: actor.uid,
    action: AUDIT_ACTIONS.WORK_POST_MODERATED,
    entityType: 'workPost',
    entityId: input.postId,
    metadata: { action: input.action, reason: input.reason },
  });
  return { postId: input.postId, isActive: input.action === 'RESTORE' };
});

/** Remove a Canvas drop through an audited admin moderation action. */
export const moderateCanvasDrop = onCall(callableOptions, async (request) => {
  const actor = await assertRole(request, ['ADMIN', 'SUPER_ADMIN']);
  const parsed = canvasDropModerationSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message);

  const input = parsed.data;
  const dropRef = db
    .collection(COLLECTIONS.CANVAS_ROOMS)
    .doc(input.roomId)
    .collection('drops')
    .doc(input.dropId);
  const drop = await dropRef.get();
  if (!drop.exists) throw new HttpsError('not-found', 'Canvas post not found.');

  await dropRef.delete();
  await writeAuditLog({
    actorUserId: actor.uid,
    action: AUDIT_ACTIONS.CANVAS_DROP_MODERATED,
    entityType: 'canvasDrop',
    entityId: `${input.roomId}/${input.dropId}`,
    metadata: {
      roomId: input.roomId,
      authorId: drop.data()?.authorId ?? null,
      kind: drop.data()?.kind ?? null,
      reason: input.reason,
      action: 'REMOVE',
    },
  });
  return { roomId: input.roomId, dropId: input.dropId, removed: true };
});

/** Publish an official post to the Build board from the Super Admin control centre. */
export const createOfficialWorkPost = onCall(callableOptions, async (request) => {
  const actor = await assertRole(request, ['SUPER_ADMIN']);
  const parsed = officialPostSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message);

  const input = parsed.data;
  const postRef = db.collection(COLLECTIONS.WORK_POSTS).doc();
  await postRef.set({
    ...input,
    studentUserId: actor.uid,
    studentName: 'Citians Admin',
    registerNumber: 'OFFICIAL',
    departmentId: 'all',
    departmentName: 'All Departments',
    year: 'All',
    section: 'All',
    progressStatus: 'SHIPPED',
    tags: ['official'],
    lookingForHelp: false,
    likedByUserIds: [],
    isActive: true,
    isOfficial: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await writeAuditLog({
    actorUserId: actor.uid,
    action: AUDIT_ACTIONS.OFFICIAL_POST_CREATED,
    entityType: 'workPost',
    entityId: postRef.id,
  });
  return { postId: postRef.id };
});
