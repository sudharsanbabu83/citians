import { create } from 'zustand';
import type { User as FirebaseUser } from 'firebase/auth';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/src/config/firebase';
import type { User } from '@campusflow/shared';

import {
  loadAuthenticatedSession,
  mapAuthError,
  signInWithEmailPassword,
  sendCollegeEmailVerification,
  signOutUser,
  subscribeToAuthState,
  userNeedsProfileSetup,
  type RoleProfile,
} from '@/src/lib/auth';
import { registerStudentAccount, setupUsernameAccount } from '@/src/lib/registerApi';
import type { RegisterStudentInput } from '@/src/lib/registerApi';
import {
  clearActivity,
  isSessionExpired,
  recordActivity,
} from '@/src/lib/sessionActivity';
import {
  claimDeviceSession,
  refreshDeviceSession,
  releaseDeviceSession,
} from '@/src/lib/sessionApi';

interface AuthState {
  user: FirebaseUser | null;
  profile: User | null;
  roleProfile: RoleProfile | null;
  needsProfileSetup: boolean;
  isAuthLoading: boolean;
  isProfileLoading: boolean;
  authError: string | null;
  setUser: (user: FirebaseUser | null) => void;
  setProfile: (profile: User | null) => void;
  setRoleProfile: (roleProfile: RoleProfile | null) => void;
  clearError: () => void;
  initializeAuth: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: RegisterStudentInput) => Promise<void>;
  setupUsername: (username: string) => Promise<void>;
  signOut: () => Promise<void>;
}

async function completeSignIn(
  firebaseUser: FirebaseUser,
  set: (partial: Partial<AuthState>) => void
): Promise<void> {
  const { profile, roleProfile } = await loadAuthenticatedSession(firebaseUser);
  await claimDeviceSession();
  await recordActivity();
  set({
    user: firebaseUser,
    profile,
    roleProfile,
    needsProfileSetup: userNeedsProfileSetup(profile),
    isAuthLoading: false,
    isProfileLoading: false,
    authError: null,
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  roleProfile: null,
  needsProfileSetup: false,
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
          needsProfileSetup: false,
          isAuthLoading: false,
          isProfileLoading: false,
        });
        return;
      }

      if (await isSessionExpired()) {
        await signOutUser();
        await clearActivity();
        set({
          user: null,
          profile: null,
          roleProfile: null,
          needsProfileSetup: false,
          isAuthLoading: false,
          isProfileLoading: false,
        });
        return;
      }

      if (get().user?.uid === firebaseUser.uid && get().profile) {
        try {
          await refreshDeviceSession();
          await recordActivity();
          const profile = get().profile!;
          set({
            needsProfileSetup: userNeedsProfileSetup(profile),
            isAuthLoading: false,
            authError: null,
          });
        } catch (err) {
          await signOutUser();
          await clearActivity();
          set({
            user: null,
            profile: null,
            roleProfile: null,
            needsProfileSetup: false,
            isAuthLoading: false,
            isProfileLoading: false,
            authError: mapAuthError(err),
          });
        }
        return;
      }

      set({ isProfileLoading: true, authError: null });

      try {
        const { profile, roleProfile } = await loadAuthenticatedSession(firebaseUser);
        await refreshDeviceSession();
        await recordActivity();
        set({
          user: firebaseUser,
          profile,
          roleProfile,
          needsProfileSetup: userNeedsProfileSetup(profile),
          isAuthLoading: false,
          isProfileLoading: false,
          authError: null,
        });
      } catch (err) {
        await signOutUser();
        await clearActivity();
        set({
          user: null,
          profile: null,
          roleProfile: null,
          needsProfileSetup: false,
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
      await completeSignIn(firebaseUser, set);
    } catch (err) {
      await signOutUser();
      await clearActivity();
      const message = mapAuthError(err);
      set({
        user: null,
        profile: null,
        roleProfile: null,
        needsProfileSetup: false,
        isAuthLoading: false,
        isProfileLoading: false,
        authError: message,
      });
      throw new Error(message);
    }
  },

  register: async (input) => {
    set({ isProfileLoading: true, authError: null });

    try {
      await registerStudentAccount(input);
      const credential = await signInWithEmailAndPassword(auth, input.email, input.password);
      const firebaseUser = credential.user;
      // A newly created account is intentionally unverified. Send the link and
      // stop here; the user must confirm it before entering the app.
      await sendCollegeEmailVerification(firebaseUser);
      await signOutUser();
      throw new Error(
        'Account created. Check your college email and click the verification link before signing in.'
      );
    } catch (err) {
      await signOutUser();
      await clearActivity();
      const message = mapAuthError(err);
      set({
        user: null,
        profile: null,
        roleProfile: null,
        needsProfileSetup: false,
        isAuthLoading: false,
        isProfileLoading: false,
        authError: message,
      });
      throw new Error(message);
    }
  },

  setupUsername: async (username) => {
    const { user } = get();
    if (!user) {
      throw new Error('Not signed in.');
    }

    set({ isProfileLoading: true, authError: null });

    try {
      await setupUsernameAccount(username);
      const { profile, roleProfile } = await loadAuthenticatedSession(user);
      set({
        profile,
        roleProfile,
        needsProfileSetup: userNeedsProfileSetup(profile),
        isProfileLoading: false,
        authError: null,
      });
    } catch (err) {
      const message = mapAuthError(err);
      set({ isProfileLoading: false, authError: message });
      throw new Error(message);
    }
  },

  signOut: async () => {
    try {
      await releaseDeviceSession();
    } catch {
      // Continue sign-out even if session release fails (network/offline).
    }
    await signOutUser();
    await clearActivity();
    set({
      user: null,
      profile: null,
      roleProfile: null,
      needsProfileSetup: false,
      authError: null,
      isAuthLoading: false,
      isProfileLoading: false,
    });
  },
}));
