import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type {
  WorkPost,
  WorkPostCategory,
  WorkPostWithId,
  WorkProgressStatus,
} from '@campusflow/shared';
import {
  COLLECTIONS,
  createWorkPostInputSchema,
  updateWorkPostInputSchema,
} from '@campusflow/shared';

import { db } from '@/src/config/firebase';
import { toDate } from '@/src/lib/dates';
import { sortByTrending } from '@/src/lib/workPostEngagement';

export type WorkPostFilter = 'ALL' | 'MY_DEPT' | 'NEEDS_HELP' | 'TRENDING';

export interface WorkPostAuthorContext {
  studentUserId: string;
  studentName: string;
  registerNumber: string;
  departmentId: string;
  departmentName: string;
  year: string;
  section: string;
}

export interface CreateWorkPostInput {
  title: string;
  description: string;
  category: WorkPostCategory;
  progressStatus: WorkProgressStatus;
  tags: string[];
  lookingForHelp: boolean;
  experimentId?: string;
}

export interface UpdateWorkPostInput {
  postId: string;
  title?: string;
  description?: string;
  category?: WorkPostCategory;
  progressStatus?: WorkProgressStatus;
  tags?: string[];
  lookingForHelp?: boolean;
}

function mapWorkPost(id: string, data: WorkPost): WorkPostWithId {
  return { id, ...data };
}

export function formatWorkPostTime(value: unknown): string {
  const date = toDate(value);
  if (!date) return 'Just now';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function neutralChip(isDark: boolean): { color: string; bg: string } {
  return {
    color: isDark ? '#FFFFFF' : '#191919',
    bg: isDark ? '#283037' : '#F3F2EF',
  };
}

export function getWorkPostCategoryMeta(
  category: WorkPostCategory,
  isDark = false
): {
  label: string;
  emoji: string;
  color: string;
  bg: string;
} {
  const chip = neutralChip(isDark);
  switch (category) {
    case 'AI_ML':
      return { label: 'AI / ML', emoji: '🤖', ...chip };
    case 'WEB':
      return { label: 'Web Dev', emoji: '💻', ...chip };
    case 'MOBILE':
      return { label: 'Mobile', emoji: '📱', ...chip };
    case 'OPEN_SOURCE':
      return { label: 'Open Source', emoji: '🌐', ...chip };
    case 'RESEARCH':
      return { label: 'Research', emoji: '🔬', ...chip };
    case 'DESIGN':
      return { label: 'Design', emoji: '🎨', ...chip };
    default:
      return { label: 'Other', emoji: '✨', ...chip };
  }
}

export function getWorkProgressMeta(
  status: WorkProgressStatus,
  isDark = false
): {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  progress: number;
} {
  const chip = neutralChip(isDark);
  switch (status) {
    case 'JUST_STARTED':
      return { label: 'Just started', emoji: '🌱', ...chip, progress: 0.2 };
    case 'IN_PROGRESS':
      return { label: 'Building', emoji: '⚡', ...chip, progress: 0.55 };
    case 'POLISHING':
      return { label: 'Polishing', emoji: '✨', ...chip, progress: 0.8 };
    case 'SHIPPED':
      return { label: 'Shipped', emoji: '🚀', ...chip, progress: 1 };
  }
}

export function getHypeCount(post: WorkPost): number {
  return post.likedByUserIds?.length ?? 0;
}

export function hasUserHyped(post: WorkPost, userId: string | undefined): boolean {
  if (!userId) return false;
  return post.likedByUserIds?.includes(userId) ?? false;
}

export async function fetchActiveWorkPosts(
  filter: WorkPostFilter,
  departmentId?: string
): Promise<WorkPostWithId[]> {
  const base = collection(db, COLLECTIONS.WORK_POSTS);
  let q;

  if (filter === 'MY_DEPT' && departmentId) {
    q = query(
      base,
      where('isActive', '==', true),
      where('departmentId', '==', departmentId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
  } else {
    q = query(
      base,
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
  }

  const snapshot = await getDocs(q);
  let posts = snapshot.docs.map((item) =>
    mapWorkPost(item.id, item.data() as WorkPost)
  );

  if (filter === 'NEEDS_HELP') {
    posts = posts.filter((post) => post.lookingForHelp);
  }

  if (filter === 'TRENDING') {
    posts = sortByTrending(posts);
  }

  return posts;
}

export async function fetchMyActiveWorkPost(
  studentUserId: string
): Promise<WorkPostWithId | null> {
  const q = query(
    collection(db, COLLECTIONS.WORK_POSTS),
    where('studentUserId', '==', studentUserId),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  const snapshot = await getDocs(q);
  const first = snapshot.docs.find((item) => !item.data().experimentId);
  if (!first) return null;
  return mapWorkPost(first.id, first.data() as WorkPost);
}

async function deactivateExistingPosts(studentUserId: string): Promise<void> {
  const q = query(
    collection(db, COLLECTIONS.WORK_POSTS),
    where('studentUserId', '==', studentUserId),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);
  const regularPosts = snapshot.docs.filter((item) => !item.data().experimentId);
  if (regularPosts.length === 0) return;

  const batch = writeBatch(db);
  regularPosts.forEach((item) => {
    batch.update(item.ref, { isActive: false, updatedAt: serverTimestamp() });
  });
  await batch.commit();
}

export async function createWorkPost(
  author: WorkPostAuthorContext,
  input: CreateWorkPostInput
): Promise<string> {
  const payload = createWorkPostInputSchema.parse({
    ...author,
    ...input,
    tags: input.tags.slice(0, 3),
    lookingForHelp: input.lookingForHelp,
  });

  if (!input.experimentId) {
    await deactivateExistingPosts(author.studentUserId);
  }

  const ref = doc(collection(db, COLLECTIONS.WORK_POSTS));
  const batch = writeBatch(db);
  batch.set(ref, {
    ...payload,
    likedByUserIds: [],
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

  return ref.id;
}

export async function updateWorkPost(input: UpdateWorkPostInput): Promise<void> {
  const parsed = updateWorkPostInputSchema.parse(input);
  const { postId, ...updates } = parsed;

  await updateDoc(doc(db, COLLECTIONS.WORK_POSTS, postId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveWorkPost(postId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.WORK_POSTS, postId), {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleWorkPostHype(
  postId: string,
  userId: string,
  currentlyHyped: boolean
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.WORK_POSTS, postId), {
    likedByUserIds: currentlyHyped ? arrayRemove(userId) : arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
}

export function getAvatarColor(name: string): string {
  const palette = ['#191919', '#333333', '#4A4A4A', '#5C5C5C', '#6B6B6B', '#7A7A7A'];
  const code = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[code % palette.length];
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
