import { create } from 'zustand';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User } from '@campusflow/shared';

import {
  loadAuthenticatedSession,
  mapAuthError,
  signInWithEmailPassword,
  signOutUser,
  subscribeToAuthState,
  type RoleProfile,
} from '@/src/lib/auth';

interface AuthState {
  user: FirebaseUser | null;
  profile: User | null;
  roleProfile: RoleProfile | null;
  isAuthLoading: boolean;
  isProfileLoading: boolean;
  authError: string | null;
  setUser: (user: FirebaseUser | null) => void;
  setProfile: (profile: User | null) => void;
  setRoleProfile: (roleProfile: RoleProfile | null) => void;
  clearError: () => void;
  initializeAuth: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  roleProfile: null,
  isAuthLoading: true,
  isProfileLoading: false,
  authError: null,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setRoleProfile: (roleProfile) => set({ roleProfile }),
  clearError: () => set({ authError: null }),

  initializeAuth: () => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (get().isProfileLoading) return;

      if (!firebaseUser) {
        set({
          user: null,
          profile: null,
          roleProfile: null,
          isAuthLoading: false,
          isProfileLoading: false,
        });
        return;
      }

      if (get().user?.uid === firebaseUser.uid && get().profile) {
        set({ isAuthLoading: false });
        return;
      }

      set({ isProfileLoading: true, authError: null });

      try {
        const { profile, roleProfile } = await loadAuthenticatedSession(firebaseUser);
        set({
          user: firebaseUser,
          profile,
          roleProfile,
          isAuthLoading: false,
          isProfileLoading: false,
          authError: null,
        });
      } catch (err) {
        set({
          user: null,
          profile: null,
          roleProfile: null,
          isAuthLoading: false,
          isProfileLoading: false,
          authError: mapAuthError(err),
        });
      }
    });

    return unsubscribe;
  },

  signIn: async (email, password) => {
    set({ isProfileLoading: true, authError: null });

    try {
      const firebaseUser = await signInWithEmailPassword(email, password);
      const { profile, roleProfile } = await loadAuthenticatedSession(firebaseUser);
      set({
        user: firebaseUser,
        profile,
        roleProfile,
        isAuthLoading: false,
        isProfileLoading: false,
        authError: null,
      });
    } catch (err) {
      const message = mapAuthError(err);
      set({
        user: null,
        profile: null,
        roleProfile: null,
        isAuthLoading: false,
        isProfileLoading: false,
        authError: message,
      });
      throw new Error(message);
    }
  },

  signOut: async () => {
    await signOutUser();
    set({
      user: null,
      profile: null,
      roleProfile: null,
      authError: null,
      isAuthLoading: false,
      isProfileLoading: false,
    });
  },
}));
