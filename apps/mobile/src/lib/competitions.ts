import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type {
  Competition,
  CompetitionPlatform,
  CompetitionStatus,
} from '@campusflow/shared';
import { COLLECTIONS } from '@campusflow/shared';

import { db } from '@/src/config/firebase';
import { toDate } from '@/src/lib/dates';

export interface CompetitionWithId extends Competition {
  id: string;
}

export function formatCompetitionDateTime(value: unknown): string {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatCompetitionDate(value: unknown): string {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatPlatformLabel(
  platform: CompetitionPlatform,
  platformLabel?: string | null
): string {
  if (platform === 'OTHER') return platformLabel?.trim() || 'Other';
  switch (platform) {
    case 'DEVPOST':
      return 'Devpost';
    case 'HACKEREARTH':
      return 'HackerEarth';
    case 'UNSTOP':
      return 'Unstop';
    case 'HACKATHON_COM':
      return 'Hackathon.com';
    case 'CODECHEF':
      return 'CodeChef';
    case 'CODEFORCES':
      return 'Codeforces';
    default:
      return platform;
  }
}

export function formatCompetitionMode(mode: Competition['mode']): string {
  switch (mode) {
    case 'ONLINE':
      return 'Online';
    case 'OFFLINE':
      return 'Offline';
    case 'HYBRID':
      return 'Hybrid';
    default:
      return mode;
  }
}

export function formatCompetitionStatus(status: CompetitionStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'PUBLISHED':
      return 'Published';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

export function isRegistrationOpen(competition: Competition): boolean {
  if (competition.status !== 'PUBLISHED') return false;
  const deadline = toDate(competition.registrationDeadline);
  if (!deadline) return false;
  return new Date() <= deadline;
}

export function getDaysUntilDeadline(competition: Competition): number | null {
  const deadline = toDate(competition.registrationDeadline);
  if (!deadline) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDeadlineLabel(competition: Competition): string {
  const days = getDaysUntilDeadline(competition);
  if (days === null) return 'Deadline TBA';
  if (days < 0) return 'Registration closed';
  if (days === 0) return 'Closes today';
  if (days === 1) return 'Closes tomorrow';
  return `${days} days left to register`;
}

function mapCompetition(id: string, data: Competition): CompetitionWithId {
  return { id, ...data };
}

export async function fetchPublishedCompetitions(
  platformFilter?: CompetitionPlatform | 'ALL'
): Promise<CompetitionWithId[]> {
  const q = query(
    collection(db, COLLECTIONS.COMPETITIONS),
    where('status', '==', 'PUBLISHED'),
    orderBy('startAt', 'asc'),
    limit(50)
  );

  const snapshot = await getDocs(q);
  let competitions = snapshot.docs.map((d) =>
    mapCompetition(d.id, d.data() as Competition)
  );

  if (platformFilter && platformFilter !== 'ALL') {
    competitions = competitions.filter(
      (competition) => competition.platform === platformFilter
    );
  }

  return competitions;
}

export async function fetchCompetitionById(
  competitionId: string
): Promise<CompetitionWithId | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.COMPETITIONS, competitionId));
  if (!snap.exists()) return null;
  return mapCompetition(snap.id, snap.data() as Competition);
}

export async function fetchAdminCompetitions(
  userId: string
): Promise<CompetitionWithId[]> {
  const q = query(
    collection(db, COLLECTIONS.COMPETITIONS),
    where('createdByUserId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapCompetition(d.id, d.data() as Competition));
}

export function countOpenRegistrations(competitions: CompetitionWithId[]): number {
  return competitions.filter(isRegistrationOpen).length;
}
