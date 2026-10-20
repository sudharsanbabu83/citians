import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';

import { db } from '@/src/config/firebase';
import { toDate } from '@/src/lib/dates';
import { COLLECTIONS } from '@campusflow/shared';

export interface AdminTechUpdate {
  id: string;
  category: 'AI' | 'Build' | 'Cyber safety' | 'Future';
  icon: string;
  accent: string;
  source: string;
  age: string;
  title: string;
  summary: string;
  takeaway: string;
  published: boolean;
}

export interface AdminSpark {
  id: string;
  category: string;
  eyebrow: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  takeaway: string;
  published: boolean;
}

export type OpeningSpotlightTarget = 'EVENTS' | 'EVENT_DETAIL' | 'TECH_PULSE' | 'CODE_TOGETHER' | 'NETWORK' | 'FOCUS';

export interface OpeningSpotlight {
  id: string;
  kind: 'EVENT' | 'TECH' | 'COMPETITION' | 'GENERAL';
  title: string;
  message: string;
  actionLabel: string;
  target: OpeningSpotlightTarget;
  targetId?: string | null;
  emoji: string;
  accentColor: string;
  published: boolean;
  startsAt?: unknown;
  endsAt?: unknown;
  createdAt?: unknown;
}

export async function fetchPublishedTechUpdates(): Promise<AdminTechUpdate[]> {
  try {
    const snapshot = await getDocs(query(
      collection(db, COLLECTIONS.TECH_PULSE),
      where('published', '==', true),
      orderBy('createdAt', 'desc'),
      limit(20),
    ));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as AdminTechUpdate));
  } catch {
    return [];
  }
}

export async function fetchPublishedSparks(): Promise<AdminSpark[]> {
  try {
    const snapshot = await getDocs(query(
      collection(db, COLLECTIONS.DAILY_SPARKS),
      where('published', '==', true),
      orderBy('createdAt', 'desc'),
      limit(30),
    ));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as AdminSpark));
  } catch {
    return [];
  }
}

export async function fetchPublishedOpeningSpotlights(): Promise<OpeningSpotlight[]> {
  try {
    const snapshot = await getDocs(query(
      collection(db, COLLECTIONS.OPENING_SPOTLIGHTS),
      where('published', '==', true),
      limit(30),
    ));
    const now = Date.now();
    return snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() } as OpeningSpotlight))
      .filter((item) => {
        const startsAt = toDate(item.startsAt)?.getTime();
        const endsAt = toDate(item.endsAt)?.getTime();
        return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
      })
      .sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
  } catch {
    return [];
  }
}
