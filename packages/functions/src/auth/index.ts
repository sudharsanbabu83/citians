import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { FieldValue } from 'firebase-admin/firestore';
import {
  COLLECTIONS,
  COLLEGE_EMAIL_DOMAIN,
  isCollegeEmail,
  registerStudentInputSchema,
  setupUsernameInputSchema,
  usernameKey,
} from '@campusflow/shared';
import { callableOptions } from '../utils/callableOptions';
import { auth, db } from '../utils/firebase';
import { allocateCitianId } from '../utils/citianId';

async function assertUsernameAvailable(username: string, excludeUid?: string): Promise<void> {
  const key = usernameKey(username);
  const snapshot = await db
    .collection(COLLECTIONS.USERS)
    .where('usernameLower', '==', key)
    .limit(1)
    .get();

  if (!snapshot.empty && snapshot.docs[0]!.id !== excludeUid) {
    throw new HttpsError('already-exists', 'That username is already taken. Try another.');
  }
}

export const registerStudent = onCall(callableOptions, async (request) => {
  const parsed = registerStudentInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const input = parsed.data;
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim();
  const usernameLower = usernameKey(username);

  if (!isCollegeEmail(email, COLLEGE_EMAIL_DOMAIN)) {
    throw new HttpsError('invalid-argument', `Use your college email (@${COLLEGE_EMAIL_DOMAIN}).`);
  }

  await assertUsernameAvailable(username);

  const requestedDepartment = input.departmentId.trim();
  let departmentId = requestedDepartment || 'unassigned';
  let deptSnap = await db.collection(COLLECTIONS.DEPARTMENTS).doc(departmentId).get();
  if (!deptSnap.exists && departmentId !== 'unassigned') {
    const departments = await db.collection(COLLECTIONS.DEPARTMENTS).get();
    const normalized = requestedDepartment.toLowerCase();
    const aliases = normalized
      .split(/\s+or\s+/i)
      .map((value) => value.trim())
      .filter(Boolean);
    const match = departments.docs.find((department) => {
      const data = department.data();
      return [department.id, data.name, data.code].some((value) => {
        const candidate = String(value ?? '').trim().toLowerCase();
        return candidate === normalized || aliases.includes(candidate);
      });
    });
    if (!match) throw new HttpsError('not-found', 'Department not found. Enter the exact department name or code.');
    departmentId = match.id;
    deptSnap = match;
  }
  if (!deptSnap.exists && departmentId === 'unassigned') {
    await db.collection(COLLECTIONS.DEPARTMENTS).doc(departmentId).set({
      name: 'Unassigned', code: 'UNASSIGNED', isActive: true,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
  }

  let uid: string;
  let activatingExisting = false;

  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;

    const hasPassword = existing.providerData.some((provider) => provider.providerId === 'password');
    if (hasPassword) {
      throw new HttpsError('already-exists', 'This email is already registered. Sign in instead.');
    }

    await auth.updateUser(uid, { password: input.password, displayName: username });
    activatingExisting = true;
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/user-not-found') {
      const created = await auth.createUser({
        email,
        password: input.password,
        displayName: username,
        // Email verification is completed by the client through Firebase Auth.
        // Never mark a newly registered account as verified server-side.
        emailVerified: false,
      });
      uid = created.uid;
    } else if ((err as HttpsError).code) {
      throw err;
    } else {
      throw new HttpsError('internal', 'Failed to create account.');
    }
  }

  const timestamp = FieldValue.serverTimestamp();
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userSnap = await userRef.get();

  try {
    if (userSnap.exists) {
      const data = userSnap.data()!;
      if (data.role !== 'STUDENT') {
        throw new HttpsError('failed-precondition', 'This email is not a student account.');
      }
      if (data.usernameLower) {
        throw new HttpsError('already-exists', 'This account is already set up. Sign in instead.');
      }

      await userRef.update({
        username,
        usernameLower,
        phone: input.phone.trim(),
        name: username,
        ...(userSnap.data()?.citianId ? {} : { citianId: await allocateCitianId() }),
        updatedAt: timestamp,
      });
    } else {
      await userRef.set({
        uid,
        name: username,
        username,
        usernameLower,
        citianId: await allocateCitianId(),
        email,
        phone: input.phone.trim(),
        role: 'STUDENT',
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      await db.collection(COLLECTIONS.STUDENTS).doc(uid).set({
        userId: uid,
        registerNumber: input.registerNumber.trim(),
        departmentId,
        year: input.year.trim(),
        section: input.section.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    if (activatingExisting) {
      const studentRef = db.collection(COLLECTIONS.STUDENTS).doc(uid);
      const studentSnap = await studentRef.get();
      if (!studentSnap.exists) {
        await studentRef.set({
          userId: uid,
          registerNumber: input.registerNumber.trim(),
          departmentId,
          year: input.year.trim(),
          section: input.section.trim(),
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }
  } catch (err) {
    if (!userSnap.exists) {
      await auth.deleteUser(uid).catch(() => undefined);
    }
    throw err;
  }

  logger.info('registerStudent completed', { uid, email, activatingExisting });

  return { uid, email, username };
});

export const setupUsername = onCall(callableOptions, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in to continue.');
  }

  const parsed = setupUsernameInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const uid = request.auth.uid;
  const username = parsed.data.username.trim();
  const usernameLower = usernameKey(username);

  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new HttpsError('not-found', 'Account not found.');
  }

  const user = userSnap.data()!;
  if (user.role !== 'STUDENT') {
    throw new HttpsError('failed-precondition', 'Only students need a public username.');
  }
  if (user.usernameLower) {
    throw new HttpsError('failed-precondition', 'Username is already set.');
  }

  await assertUsernameAvailable(username, uid);

  await userRef.update({
    username,
    usernameLower,
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info('setupUsername completed', { uid, username });

  return { uid, username };
});
