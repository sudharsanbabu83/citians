import { create } from 'zustand';
import type { HealthCheckResponse } from '@campusflow/shared';

interface AppState {
  healthCheck: HealthCheckResponse | null;
  healthError: string | null;
  isCheckingHealth: boolean;
  setHealthCheck: (health: HealthCheckResponse | null) => void;
  setHealthError: (error: string | null) => void;
  setIsCheckingHealth: (checking: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  healthCheck: null,
  healthError: null,
  isCheckingHealth: true,
  setHealthCheck: (healthCheck) => set({ healthCheck }),
  setHealthError: (healthError) => set({ healthError }),
  setIsCheckingHealth: (isCheckingHealth) => set({ isCheckingHealth }),
}));
