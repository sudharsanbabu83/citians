import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { FieldValue } from 'firebase-admin/firestore';
import {
  COLLECTIONS,
  COLLEGE_EMAIL_DOMAIN,
  isCollegeEmail,
  provisionUserInputSchema,
} from '@campusflow/shared';
import { assertRole } from '../utils/auth';
import { callableOptions } from '../utils/callableOptions';
import { auth, db } from '../utils/firebase';

export const provisionUser = onCall(callableOptions, async (request) => {
  await assertRole(request, ['ADMIN']);

  const parsed = provisionUserInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const input = parsed.data;
  const email = input.email.trim().toLowerCase();

  if (!isCollegeEmail(email, COLLEGE_EMAIL_DOMAIN)) {
    throw new HttpsError('invalid-argument', `Email must be @${COLLEGE_EMAIL_DOMAIN}.`);
  }

  if (input.role === 'STUDENT' || input.role === 'HOD') {
    const deptSnap = await db.collection(COLLECTIONS.DEPARTMENTS).doc(input.departmentId!).get();
    if (!deptSnap.exists) {
      throw new HttpsError('not-found', 'Department not found.');
    }
  }

  let uid: string;
  try {
    const created = await auth.createUser({
      email,
      password: input.password,
      displayName: input.name,
      emailVerified: true,
    });
    uid = created.uid;
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'An account with this email already exists.');
    }
    throw new HttpsError('internal', 'Failed to create auth account.');
  }

  const timestamp = FieldValue.serverTimestamp();

  try {
    await db
      .collection(COLLECTIONS.USERS)
      .doc(uid)
      .set({
        uid,
        name: input.name,
        email,
        phone: input.phone ?? '',
        role: input.role,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

    if (input.role === 'STUDENT') {
      await db.collection(COLLECTIONS.STUDENTS).doc(uid).set({
        userId: uid,
        registerNumber: input.registerNumber!,
        departmentId: input.departmentId!,
        year: input.year!,
        section: input.section!,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    if (input.role === 'HOD') {
      await db.collection(COLLECTIONS.HODS).doc(uid).set({
        userId: uid,
        departmentId: input.departmentId!,
        designation: input.designation!,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      await db.collection(COLLECTIONS.DEPARTMENTS).doc(input.departmentId!).update({
        hodId: uid,
        updatedAt: timestamp,
      });
    }
  } catch (err) {
    await auth.deleteUser(uid).catch(() => undefined);
    throw err;
  }

  logger.info('provisionUser completed', { uid, email, role: input.role });

  return { uid, email, role: input.role };
});
