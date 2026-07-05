/**
 * One-time production bootstrap: creates the first ADMIN user + default department.
 *
 * Prerequisites:
 *   - Firebase project with Auth + Firestore enabled
 *   - Application Default Credentials (one of):
 *       firebase login
 *       gcloud auth application-default login
 *       GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *
 * Usage:
 *   npm run bootstrap:admin -- --email admin.campusflow@citchennai.net --name "Campus Admin" --password "YourSecurePassword"
 *
 * Optional:
 *   --project campusflow-f798c
 *   --department cse --department-name "Computer Science" --department-code CSE
 */

import * as admin from 'firebase-admin';
import { COLLECTIONS, FIREBASE_PROJECT_ID } from '@campusflow/shared';

const args = process.argv.slice(2);

function readFlag(flag: string): string | null {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}

const email = readFlag('--email');
const name = readFlag('--name');
const password = readFlag('--password');
const projectId = readFlag('--project') ?? process.env.GOOGLE_CLOUD_PROJECT ?? FIREBASE_PROJECT_ID;
const departmentId = readFlag('--department') ?? 'cse';
const departmentName = readFlag('--department-name') ?? 'Computer Science and Engineering';
const departmentCode = readFlag('--department-code') ?? 'CSE';

if (!email || !name || !password) {
  console.error(
    'Usage: npm run bootstrap:admin -- --email <email> --name <name> --password <password> [--project campusflow-f798c]'
  );
  process.exit(1);
}

const adminEmail = email.trim().toLowerCase();
const adminName = name;
const adminPassword = password;

if (adminPassword.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    'Emulator env vars are set (FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST). Unset them before bootstrapping production.'
  );
  process.exit(1);
}

process.env.GOOGLE_CLOUD_PROJECT = projectId;

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();
const auth = admin.auth();

const normalizedEmail = adminEmail;

async function bootstrap(): Promise<void> {
  console.log(`Bootstrapping admin on project: ${projectId}`);
  console.log('Ensure you are authenticated: firebase login && gcloud auth application-default login\n');

  let uid: string;
  try {
    const existing = await auth.getUserByEmail(normalizedEmail);
    uid = existing.uid;
    await auth.updateUser(uid, {
      password: adminPassword,
      displayName: adminName,
      emailVerified: true,
    });
    console.log('Updated existing Auth user:', uid);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code !== 'auth/user-not-found') throw err;
    const created = await auth.createUser({
      email: normalizedEmail,
      password: adminPassword,
      displayName: adminName,
      emailVerified: true,
    });
    uid = created.uid;
    console.log('Created Auth user:', uid);
  }

  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  await db
    .collection(COLLECTIONS.USERS)
    .doc(uid)
    .set(
      {
        uid,
        name: adminName,
        email: normalizedEmail,
        phone: '',
        role: 'ADMIN',
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      { merge: true }
    );

  await db
    .collection(COLLECTIONS.DEPARTMENTS)
    .doc(departmentId)
    .set(
      {
        name: departmentName,
        code: departmentCode,
        hodId: null,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      { merge: true }
    );

  console.log('\nBootstrap complete.');
  console.log('  Admin:', normalizedEmail);
  console.log('  UID:', uid);
  console.log('  Department:', departmentId);
}

bootstrap().catch((err: unknown) => {
  console.error('\nBootstrap failed:', err);
  const message = String((err as { message?: string }).message ?? err);
  if (message.includes('USER_PROJECT_DENIED') || message.includes('not found or deleted')) {
    console.error(
      '\nTip: Your Google credentials may point at a different Firebase/GCP project.',
      `\nRun: gcloud auth application-default login --project=${projectId}`,
      `\nOr set GOOGLE_APPLICATION_CREDENTIALS to a service account key for ${projectId}.`
    );
  }
  process.exit(1);
});
