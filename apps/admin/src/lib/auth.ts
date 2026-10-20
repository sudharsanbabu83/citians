import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '@campusflow/shared';
import { COLLECTIONS, COLLEGE_EMAIL_DOMAIN, isCollegeEmail } from '@campusflow/shared';

import { auth, db } from '../config/firebase';

export function mapAuthError(error: unknown): string {
  const code = (error as { code?: string }).code;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    default:
      return (error as Error).message || 'Sign in failed.';
  }
}

export async function signIn(email: string, password: string): Promise<FirebaseUser> {
  const normalized = email.trim().toLowerCase();
  if (!isCollegeEmail(normalized, COLLEGE_EMAIL_DOMAIN)) {
    throw new Error(`Use your college email (@${COLLEGE_EMAIL_DOMAIN}).`);
  }
  const credential = await signInWithEmailAndPassword(auth, normalized, password);
  return credential.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeToAuth(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function loadUserProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snap.exists()) return null;
  return snap.data() as User;
}
