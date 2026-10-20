import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/src/config/firebase';
import { toDate } from '@/src/lib/dates';

export const DOUBT_CATEGORIES = ['ACADEMICS', 'TECH', 'CAREER', 'COLLEGE_LIFE', 'WELLBEING'] as const;
export type DoubtCategory = (typeof DOUBT_CATEGORIES)[number];
export const HELP_MODES = ['EXPLAIN', 'EXAMPLE', 'RESOURCE', 'LIVE_SESSION'] as const;
export type HelpMode = (typeof HELP_MODES)[number];
export const BRANCH_ANGLES = ['SIMPLE', 'EXAMPLE', 'DEEP_DIVE', 'DIFFERENT_TAKE', 'RESOURCE'] as const;
export type BranchAngle = (typeof BRANCH_ANGLES)[number];
export type DoubtFilter = 'PULSE' | 'UNANSWERED' | 'MY_DEPT' | 'LIVE_SESSION';

export interface Doubt {
  id: string;
  authorId: string;
  authorAlias: string;
  departmentId: string;
  departmentName: string;
  year: string;
  title: string;
  context: string;
  category: DoubtCategory;
  helpModes: HelpMode[];
  urgency: 'CURIOUS' | 'STUCK' | 'URGENT';
  status: 'OPEN' | 'RESOLVED';
  branchCount: number;
  sessionSupporterIds: string[];
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DoubtBranch {
  id: string;
  doubtId: string;
  authorId: string;
  authorAlias: string;
  departmentName: string;
  angle: BranchAngle;
  body: string;
  helpfulByUserIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DoubtAuthorContext {
  userId: string;
  departmentId: string;
  departmentName: string;
  year: string;
}

const ALIAS_ADJECTIVES = ['Curious', 'Bright', 'Brave', 'Quiet', 'Restless', 'Keen', 'Cosmic', 'Kind'];
const ALIAS_ANIMALS = ['Otter', 'Fox', 'Owl', 'Manta', 'Panda', 'Lynx', 'Koala', 'Raven'];

export function getDoubtAlias(userId: string): string {
  const score = userId.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
  return `${ALIAS_ADJECTIVES[score % ALIAS_ADJECTIVES.length]} ${ALIAS_ANIMALS[Math.floor(score / 7) % ALIAS_ANIMALS.length]}`;
}

export function formatDoubtTime(value: unknown): string {
  const date = toDate(value);
  if (!date) return 'now';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function getCategoryMeta(category: DoubtCategory) {
  const map: Record<DoubtCategory, { label: string; emoji: string; color: string; soft: string }> = {
    ACADEMICS: { label: 'Academics', emoji: '📚', color: '#6847E8', soft: '#EEE9FF' },
    TECH: { label: 'Tech', emoji: '💻', color: '#087F73', soft: '#DDF8F1' },
    CAREER: { label: 'Career', emoji: '🧭', color: '#D65F17', soft: '#FFF0D8' },
    COLLEGE_LIFE: { label: 'College life', emoji: '🎓', color: '#D73A72', soft: '#FFE5EF' },
    WELLBEING: { label: 'Wellbeing', emoji: '🌿', color: '#2D7B45', soft: '#E1F5E7' },
  };
  return map[category];
}

export function getAngleMeta(angle: BranchAngle) {
  const map: Record<BranchAngle, { label: string; emoji: string; color: string }> = {
    SIMPLE: { label: 'Simple explain', emoji: '✨', color: '#6C4CF6' },
    EXAMPLE: { label: 'Worked example', emoji: '🧪', color: '#079A83' },
    DEEP_DIVE: { label: 'Deep dive', emoji: '🧠', color: '#D66B13' },
    DIFFERENT_TAKE: { label: 'Different take', emoji: '🌀', color: '#E63D67' },
    RESOURCE: { label: 'Useful resource', emoji: '🧰', color: '#2372C8' },
  };
  return map[angle];
}

export async function fetchDoubts(filter: DoubtFilter, departmentId?: string): Promise<Doubt[]> {
  const snapshot = await getDocs(query(
    collection(db, 'doubts'),
    where('isActive', '==', true),
    limit(60)
  ));
  let doubts = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Doubt));
  doubts.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
  if (filter === 'UNANSWERED') doubts = doubts.filter((item) => item.branchCount === 0);
  if (filter === 'MY_DEPT' && departmentId) doubts = doubts.filter((item) => item.departmentId === departmentId);
  if (filter === 'LIVE_SESSION') doubts = doubts.filter((item) => item.helpModes.includes('LIVE_SESSION') || item.sessionSupporterIds.length > 0);
  if (filter === 'PULSE') {
    doubts.sort((a, b) => (b.branchCount * 3 + b.sessionSupporterIds.length * 2) - (a.branchCount * 3 + a.sessionSupporterIds.length * 2));
  }
  return doubts;
}

export async function fetchDoubt(id: string): Promise<Doubt | null> {
  const demo = DEMO_DOUBTS.find((item) => item.id === id);
  if (demo) return demo;
  const snapshot = await getDoc(doc(db, 'doubts', id));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Doubt) : null;
}

export async function fetchDoubtBranches(doubtId: string): Promise<DoubtBranch[]> {
  if (doubtId.startsWith('demo-')) return DEMO_BRANCHES.filter((item) => item.doubtId === doubtId);
  const snapshot = await getDocs(query(
    collection(db, 'doubtBranches'),
    where('doubtId', '==', doubtId),
    limit(100)
  ));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() } as DoubtBranch))
    .sort((a, b) => (toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0));
}

export async function createDoubt(
  author: DoubtAuthorContext,
  input: Pick<Doubt, 'title' | 'context' | 'category' | 'helpModes' | 'urgency'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'doubts'), {
    authorId: author.userId,
    authorAlias: getDoubtAlias(author.userId),
    departmentId: author.departmentId,
    departmentName: author.departmentName,
    year: author.year,
    title: input.title.trim(),
    context: input.context.trim(),
    category: input.category,
    helpModes: input.helpModes,
    urgency: input.urgency,
    status: 'OPEN',
    branchCount: 0,
    sessionSupporterIds: [],
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function addDoubtBranch(
  doubtId: string,
  author: Pick<DoubtAuthorContext, 'userId' | 'departmentName'>,
  angle: BranchAngle,
  body: string
): Promise<string> {
  const branchRef = doc(collection(db, 'doubtBranches'));
  const doubtRef = doc(db, 'doubts', doubtId);
  await runTransaction(db, async (transaction) => {
    const doubtSnapshot = await transaction.get(doubtRef);
    if (!doubtSnapshot.exists()) throw new Error('This doubt is no longer available.');
    const count = Number(doubtSnapshot.data().branchCount ?? 0);
    transaction.set(branchRef, {
      doubtId,
      authorId: author.userId,
      authorAlias: getDoubtAlias(author.userId),
      departmentName: author.departmentName,
      angle,
      body: body.trim(),
      helpfulByUserIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.update(doubtRef, { branchCount: count + 1, updatedAt: serverTimestamp() });
  });
  return branchRef.id;
}

export async function toggleBranchHelpful(branchId: string, userId: string, active: boolean) {
  await updateDoc(doc(db, 'doubtBranches', branchId), {
    helpfulByUserIds: active ? arrayRemove(userId) : arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
}

export async function toggleSessionSupport(doubtId: string, userId: string, active: boolean) {
  await updateDoc(doc(db, 'doubts', doubtId), {
    sessionSupporterIds: active ? arrayRemove(userId) : arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
}

export const DEMO_DOUBTS: Doubt[] = [
  {
    id: 'demo-transformers', authorId: 'demo-a', authorAlias: 'Curious Manta', departmentId: 'cse', departmentName: 'CSE', year: '2',
    title: 'Why does attention use three different matrices?',
    context: 'I understand embeddings, but Q, K and V still feel like three names for the same thing. Can someone explain the intuition without jumping straight into equations?',
    category: 'TECH', helpModes: ['EXPLAIN', 'EXAMPLE', 'LIVE_SESSION'], urgency: 'STUCK', status: 'OPEN', branchCount: 3,
    sessionSupporterIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], isActive: true, createdAt: new Date(Date.now() - 22 * 60000), updatedAt: new Date(),
  },
  {
    id: 'demo-placement', authorId: 'demo-b', authorAlias: 'Quiet Fox', departmentId: 'ece', departmentName: 'ECE', year: '3',
    title: 'How do I choose between core and software placements?',
    context: 'I enjoy embedded systems but most of my preparation is DSA. I want perspectives from seniors who actually made this choice.',
    category: 'CAREER', helpModes: ['EXPLAIN', 'LIVE_SESSION'], urgency: 'CURIOUS', status: 'OPEN', branchCount: 5,
    sessionSupporterIds: ['a', 'b', 'c', 'd'], isActive: true, createdAt: new Date(Date.now() - 2 * 3600000), updatedAt: new Date(),
  },
  {
    id: 'demo-calculus', authorId: 'demo-c', authorAlias: 'Brave Owl', departmentId: 'mech', departmentName: 'Mechanical', year: '1',
    title: 'Where is partial differentiation actually used?',
    context: 'I can solve the textbook problems, but I cannot connect them to a real system. A visual or mechanical example would help.',
    category: 'ACADEMICS', helpModes: ['EXAMPLE'], urgency: 'STUCK', status: 'OPEN', branchCount: 0,
    sessionSupporterIds: [], isActive: true, createdAt: new Date(Date.now() - 4 * 3600000), updatedAt: new Date(),
  },
];

export const DEMO_BRANCHES: DoubtBranch[] = [
  { id: 'demo-branch-1', doubtId: 'demo-transformers', authorId: 'x', authorAlias: 'Bright Owl', departmentName: 'AI & DS', angle: 'SIMPLE', body: 'Think of Q as what a word is looking for, K as what every word advertises, and V as the information it will contribute if selected.', helpfulByUserIds: ['1', '2', '3', '4', '5', '6'], createdAt: new Date(Date.now() - 18 * 60000) },
  { id: 'demo-branch-2', doubtId: 'demo-transformers', authorId: 'y', authorAlias: 'Keen Otter', departmentName: 'CSE', angle: 'EXAMPLE', body: 'In “the animal did not cross because it was tired”, the query for “it” scores the keys for earlier nouns, then mixes their values to recover context.', helpfulByUserIds: ['1', '2', '3'], createdAt: new Date(Date.now() - 12 * 60000) },
  { id: 'demo-branch-3', doubtId: 'demo-transformers', authorId: 'z', authorAlias: 'Cosmic Raven', departmentName: 'ECE', angle: 'DIFFERENT_TAKE', body: 'They start from the same embedding but learn different projections because matching relevance and carrying content are different jobs.', helpfulByUserIds: ['1', '2'], createdAt: new Date(Date.now() - 5 * 60000) },
];
