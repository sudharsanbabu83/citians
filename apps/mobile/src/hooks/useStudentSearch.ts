import { useMemo } from 'react';

import { useDebouncedValue } from '@/src/hooks/useDebouncedValue';
import { usePublishedCompetitions } from '@/src/hooks/useCompetitions';
import { useEvents } from '@/src/hooks/useEvents';
import {
  buildStudentSearchResults,
  STUDENT_SEARCH_DEBOUNCE_MS,
  STUDENT_SEARCH_MIN_LENGTH,
  type StudentSearchResult,
} from '@/src/lib/studentSearch';
import { useStudentSearchStore } from '@/src/lib/studentSearchStore';

export function useStudentSearch(): {
  inputQuery: string;
  query: string;
  results: StudentSearchResult[];
  isSearching: boolean;
  isDebouncing: boolean;
  isLoading: boolean;
} {
  const inputQuery = useStudentSearchStore((s) => s.query);
  const debouncedQuery = useDebouncedValue(inputQuery, STUDENT_SEARCH_DEBOUNCE_MS);
  const { data: events = [], isLoading: eventsLoading } = useEvents('ALL');
  const { data: competitions = [], isLoading: competitionsLoading } = usePublishedCompetitions('ALL');

  const trimmedDebounced = debouncedQuery.trim();
  const trimmedInput = inputQuery.trim();
  const isDebouncing =
    trimmedInput.length >= STUDENT_SEARCH_MIN_LENGTH && trimmedInput !== trimmedDebounced;

  const results = useMemo(
    () =>
      buildStudentSearchResults({
        query: debouncedQuery,
        events,
        competitions,
      }),
    [debouncedQuery, events, competitions]
  );

  return {
    inputQuery,
    query: trimmedDebounced,
    results,
    isSearching: trimmedDebounced.length >= STUDENT_SEARCH_MIN_LENGTH,
    isDebouncing,
    isLoading: eventsLoading || competitionsLoading,
  };
}
