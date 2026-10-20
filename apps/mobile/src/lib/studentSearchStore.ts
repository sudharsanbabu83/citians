import { create } from 'zustand';

interface StudentSearchState {
  query: string;
  setQuery: (query: string) => void;
  clear: () => void;
}

export const useStudentSearchStore = create<StudentSearchState>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
  clear: () => set({ query: '' }),
}));
