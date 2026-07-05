import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import Constants from 'expo-constants';
import type { Href } from 'expo-router';
import type { User, Student, Hod, Role } from '@campusflow/shared';
import { COLLECTIONS, COLLEGE_EMAIL_DOMAIN, isCollegeEmail } from '@campusflow/shared';

import { auth, db, useEmulators } from '@/src/config/firebase';

export type RoleProfile =
  | { type: 'STUDENT'; data: Student; departmentName: string }
  | { type: 'HOD'; data: Hod; departmentName: string };

export function getCollegeEmailDomain(): string {
  const configured =
    Constants.expoConfig?.extra?.collegeEmailDomain ??
    process.env.EXPO_PUBLIC_COLLEGE_EMAIL_DOMAIN;

  return configured?.trim() || COLLEGE_EMAIL_DOMAIN;
}

export function validateEmailDomain(email: string): void {
  const domain = getCollegeEmailDomain();

  if (!isCollegeEmail(email, domain)) {
    throw new Error(`Please sign in with your CIT college email (@${domain}).`);
  }
}

export function mapAuthError(error: unknown): string {
  const code = (error as { code?: string }).code;
  const message = (error as Error).message;

  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      if (useEmulators) {
        return 'No account in the emulator (or wrong password). Run npm run seed on your PC while emulators are running, then try again. Password for seed users: password123';
      }
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      if (useEmulators) {
        return 'Network error. Check your connection and ensure emulators are running.';
      }
      return 'Network error. Check your internet connection and try again.';
    default:
      return message || 'Something went wrong. Please try again.';
  }
}

export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<FirebaseUser> {
  validateEmailDomain(email.trim());
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeToAuthState(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function fetchUserProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snap.exists()) return null;
  return snap.data() as User;
}

async function fetchDepartmentName(departmentId: string): Promise<string> {
  const snap = await getDoc(doc(db, COLLECTIONS.DEPARTMENTS, departmentId));
  if (!snap.exists()) return departmentId;
  return (snap.data().name as string) ?? departmentId;
}

async function fetchStudentProfile(uid: string): Promise<Student | null> {
  const byId = await getDoc(doc(db, COLLECTIONS.STUDENTS, uid));
  if (byId.exists()) return byId.data() as Student;

  const q = query(
    collection(db, COLLECTIONS.STUDENTS),
    where('userId', '==', uid),
    limit(1)
  );
  const results = await getDocs(q);
  if (results.empty) return null;
  return results.docs[0]!.data() as Student;
}

async function fetchHodProfile(uid: string): Promise<Hod | null> {
  const byId = await getDoc(doc(db, COLLECTIONS.HODS, uid));
  if (byId.exists()) return byId.data() as Hod;

  const q = query(
    collection(db, COLLECTIONS.HODS),
    where('userId', '==', uid),
    limit(1)
  );
  const results = await getDocs(q);
  if (results.empty) return null;
  return results.docs[0]!.data() as Hod;
}

export async function fetchRoleProfile(
  uid: string,
  role: Role
): Promise<RoleProfile | null> {
  if (role === 'STUDENT') {
    const student = await fetchStudentProfile(uid);
    if (!student) return null;
    const departmentName = await fetchDepartmentName(student.departmentId);
    return { type: 'STUDENT', data: student, departmentName };
  }

  if (role === 'HOD') {
    const hod = await fetchHodProfile(uid);
    if (!hod) return null;
    const departmentName = await fetchDepartmentName(hod.departmentId);
    return { type: 'HOD', data: hod, departmentName };
  }

  return null;
}

export async function loadAuthenticatedSession(
  firebaseUser: FirebaseUser
): Promise<{
  profile: User;
  roleProfile: RoleProfile | null;
}> {
  const profile = await fetchUserProfile(firebaseUser.uid);

  if (!profile) {
    await signOutUser();
    throw new Error('Account not provisioned. Contact your college admin.');
  }

  if (!profile.isActive) {
    await signOutUser();
    throw new Error('Account deactivated. Contact your college admin.');
  }

  let roleProfile: RoleProfile | null = null;
  if (profile.role === 'STUDENT' || profile.role === 'HOD') {
    roleProfile = await fetchRoleProfile(firebaseUser.uid, profile.role);
    if (!roleProfile) {
      await signOutUser();
      throw new Error('Role profile not found. Run the emulator seed and sign in again.');
    }

    const departmentId = roleProfile.data.departmentId;
    const deptSnap = await getDoc(doc(db, COLLECTIONS.DEPARTMENTS, departmentId));
    if (!deptSnap.exists()) {
      await signOutUser();
      throw new Error(
        'College department data is missing. While emulators are running, run: npm run seed'
      );
    }
  }

  return { profile, roleProfile };
}

export function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}

export function getRoleHomeRoute(role: Role): Href {
  switch (role) {
    case 'STUDENT':
      return '/(student)/(tabs)';
    case 'HOD':
      return '/(hod)/(tabs)';
    case 'ADMIN':
      return '/(admin)';
    default:
      return '/login';
  }
}
