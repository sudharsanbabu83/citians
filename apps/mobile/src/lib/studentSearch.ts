import type { CompetitionWithId, EventWithId } from '@campusflow/shared';

import type { Doubt } from '@/src/lib/doubts';
import { getCategoryMeta } from '@/src/lib/doubts';
import { formatEventType } from '@/src/lib/events';

export const STUDENT_SEARCH_MIN_LENGTH = 3;
// Wait until the user has paused typing before showing search results.
export const STUDENT_SEARCH_DEBOUNCE_MS = 700;

export type StudentSearchResultType = 'doubt' | 'event' | 'competition';

export interface StudentSearchResult {
  id: string;
  type: StudentSearchResultType;
  title: string;
  subtitle: string;
  route: string;
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchesAny(query: string, values: Array<string | undefined | null>): boolean {
  return values.some((value) => Boolean(value?.toLowerCase().includes(query)));
}

export function searchDoubts(doubts: Doubt[], query: string): Doubt[] {
  const normalized = normalizeQuery(query);
  if (normalized.length < STUDENT_SEARCH_MIN_LENGTH) return [];
  return doubts.filter((doubt) => matchesAny(normalized, [
    doubt.title,
    doubt.context,
    doubt.departmentName,
    getCategoryMeta(doubt.category).label,
    ...doubt.helpModes,
  ]));
}

export function searchEvents(events: EventWithId[], query: string): EventWithId[] {
  const normalized = normalizeQuery(query);
  if (normalized.length < STUDENT_SEARCH_MIN_LENGTH) return [];
  return events.filter((event) => matchesAny(normalized, [event.title, event.description, event.venue, formatEventType(event.type), event.type]));
}

export function searchCompetitions(competitions: CompetitionWithId[], query: string): CompetitionWithId[] {
  const normalized = normalizeQuery(query);
  if (normalized.length < STUDENT_SEARCH_MIN_LENGTH) return [];
  return competitions.filter((competition) => matchesAny(normalized, [competition.title, competition.description, competition.prizePool, competition.platform, competition.platformLabel, competition.mode, competition.teamSize]));
}

export function buildStudentSearchResults(input: {
  query: string;
  doubts: Doubt[];
  events: EventWithId[];
  competitions: CompetitionWithId[];
}): StudentSearchResult[] {
  const normalized = normalizeQuery(input.query);
  if (normalized.length < STUDENT_SEARCH_MIN_LENGTH) return [];
  const results: StudentSearchResult[] = [];

  for (const doubt of searchDoubts(input.doubts, input.query).slice(0, 7)) {
    results.push({ id: `doubt-${doubt.id}`, type: 'doubt', title: doubt.title, subtitle: `${getCategoryMeta(doubt.category).label} · ${doubt.branchCount} branches`, route: `/(student)/doubts/${doubt.id}` });
  }
  for (const event of searchEvents(input.events, input.query).slice(0, 5)) {
    results.push({ id: `event-${event.id}`, type: 'event', title: event.title, subtitle: formatEventType(event.type), route: `/(student)/events/${event.id}` });
  }
  for (const competition of searchCompetitions(input.competitions, input.query).slice(0, 5)) {
    results.push({ id: `competition-${competition.id}`, type: 'competition', title: competition.title, subtitle: 'Hackathon / competition', route: `/(student)/competitions/${competition.id}` });
  }
  return results;
}

export function getStudentSearchSectionLabel(type: StudentSearchResultType): string {
  if (type === 'doubt') return 'Doubt Exchange';
  if (type === 'event') return 'Events & hackathons';
  return 'Competitions';
}
