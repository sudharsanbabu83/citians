import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User } from '@campusflow/shared';

import { loadUserProfile, mapAuthError, signIn as authSignIn, signOut as authSignOut, subscribeToAuth } from '../lib/auth';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: User | null;
  isLoading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }
      const loaded = await loadUserProfile(user.uid);
      setProfile(loaded);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const user = await authSignIn(email, password);
      const loaded = await loadUserProfile(user.uid);
      if (!loaded || !['ADMIN', 'SUPER_ADMIN'].includes(loaded.role)) {
        await authSignOut();
        throw new Error('Admin access only. Sign in with an admin account.');
      }
      if (!loaded.isActive) {
        await authSignOut();
        throw new Error('Account deactivated.');
      }
      setFirebaseUser(user);
      setProfile(loaded);
    } catch (err) {
      const message = mapAuthError(err);
      setAuthError(message);
      setFirebaseUser(null);
      setProfile(null);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setFirebaseUser(null);
    setProfile(null);
    setAuthError(null);
  }, []);

  const clearError = useCallback(() => setAuthError(null), []);

  const value = useMemo(
    () => ({ firebaseUser, profile, isLoading, authError, signIn, signOut, clearError }),
    [firebaseUser, profile, isLoading, authError, signIn, signOut, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
