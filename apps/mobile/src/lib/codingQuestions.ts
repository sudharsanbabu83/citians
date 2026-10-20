import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type {
  CodingQuestion,
  CodingQuestionComment,
  CodingQuestionCommentWithId,
  CodingQuestionWithId,
} from '@campusflow/shared';
import { COLLECTIONS, createCodingQuestionInputSchema } from '@campusflow/shared';

import { db } from '@/src/config/firebase';

export type CodingDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface CreateCodingQuestionInput {
  authorId: string;
  authorName: string;
  title: string;
  problemStatement: string;
  solution: string;
  language: string;
  difficulty: CodingDifficulty;
  tags: string[];
}

export function formatCodingQuestionTime(value: unknown): string {
  const timestamp = value as { toDate?: () => Date } | Date | undefined;
  const date = timestamp instanceof Date ? timestamp : timestamp?.toDate?.();
  if (!date) return 'Just now';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function difficultyMeta(difficulty: CodingDifficulty): { label: string; color: string; bg: string } {
  if (difficulty === 'EASY') return { label: 'Easy', color: '#079A83', bg: '#DDF8F0' };
  if (difficulty === 'HARD') return { label: 'Hard', color: '#D53B65', bg: '#FFE4EC' };
  return { label: 'Medium', color: '#B87900', bg: '#FFF2D3' };
}

export async function fetchCodingQuestions(): Promise<CodingQuestionWithId[]> {
  const snapshot = await getDocs(query(
    collection(db, COLLECTIONS.CODING_QUESTIONS),
    where('isActive', '==', true),
    limit(50)
  ));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() } as CodingQuestionWithId))
    .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
}

export async function createCodingQuestion(input: CreateCodingQuestionInput): Promise<string> {
  const parsed = createCodingQuestionInputSchema.parse({
    ...input,
    tags: input.tags.slice(0, 5),
  });
  const ref = doc(collection(db, COLLECTIONS.CODING_QUESTIONS));
  const batch = writeBatch(db);
  batch.set(ref, {
    ...parsed,
    likedByUserIds: [],
    commentCount: 0,
    flagCount: 0,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return ref.id;
}

export async function toggleCodingQuestionLike(question: CodingQuestionWithId, userId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.CODING_QUESTIONS, question.id), {
    likedByUserIds: question.likedByUserIds.includes(userId) ? arrayRemove(userId) : arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
}

export async function fetchCodingQuestionComments(questionId: string): Promise<CodingQuestionCommentWithId[]> {
  const snapshot = await getDocs(query(
    collection(db, COLLECTIONS.CODING_QUESTION_COMMENTS),
    where('questionId', '==', questionId),
    limit(100)
  ));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() } as CodingQuestionCommentWithId))
    .sort((a, b) => getMillis(a.createdAt) - getMillis(b.createdAt));
}

export async function addCodingQuestionComment(input: Omit<CodingQuestionComment, 'createdAt'>): Promise<void> {
  const commentRef = doc(collection(db, COLLECTIONS.CODING_QUESTION_COMMENTS));
  const questionRef = doc(db, COLLECTIONS.CODING_QUESTIONS, input.questionId);
  const question = await getDoc(questionRef);
  if (!question.exists() || question.data().isActive !== true) throw new Error('This question is no longer available.');
  const count = Number(question.data().commentCount ?? 0);
  const batch = writeBatch(db);
  batch.set(commentRef, { ...input, createdAt: serverTimestamp() });
  batch.update(questionRef, { commentCount: count + 1, updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function flagCodingQuestion(questionId: string, reporterId: string, reason: string): Promise<void> {
  const flagRef = doc(db, COLLECTIONS.CODING_QUESTION_FLAGS, `${questionId}_${reporterId}`);
  const questionRef = doc(db, COLLECTIONS.CODING_QUESTIONS, questionId);
  const [existingFlag, question] = await Promise.all([getDoc(flagRef), getDoc(questionRef)]);
  if (existingFlag.exists()) throw new Error('You have already flagged this question.');
  if (!question.exists() || question.data().isActive !== true) throw new Error('This question is no longer available.');
  const batch = writeBatch(db);
  batch.set(flagRef, { questionId, reporterId, reason: reason.trim(), createdAt: serverTimestamp() });
  batch.update(questionRef, {
    flagCount: Number(question.data().flagCount ?? 0) + 1,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function deleteCodingQuestion(questionId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.CODING_QUESTIONS, questionId), {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

function getMillis(value: unknown): number {
  const timestamp = value as { toDate?: () => Date } | Date | undefined;
  const date = timestamp instanceof Date ? timestamp : timestamp?.toDate?.();
  return date?.getTime() ?? 0;
}
