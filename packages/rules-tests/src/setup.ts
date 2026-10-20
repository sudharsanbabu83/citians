import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach } from 'vitest';

import { seedBaseData, type SeedIds } from './fixtures';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export const PROJECT_ID = 'campusflow-f798c';

function emulatorHost(envVar: string | undefined, fallbackHost: string, fallbackPort: number) {
  if (envVar) {
    const [host, port] = envVar.split(':');
    return { host: host ?? fallbackHost, port: Number(port ?? fallbackPort) };
  }
  return { host: fallbackHost, port: fallbackPort };
}

const firestoreEmulator = emulatorHost(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1', 8085);
const storageEmulator = emulatorHost(process.env.FIREBASE_STORAGE_EMULATOR_HOST, '127.0.0.1', 9195);

let testEnv: RulesTestEnvironment;

export function getTestEnv(): RulesTestEnvironment {
  if (!testEnv) {
    throw new Error('Test environment not initialized. Did you forget beforeAll?');
  }
  return testEnv;
}

export function authedDb(uid: string): Firestore {
  return getTestEnv().authenticatedContext(uid).firestore() as unknown as Firestore;
}

export function authedStorage(uid: string) {
  return getTestEnv().authenticatedContext(uid).storage();
}

export function unauthedDb(): Firestore {
  return getTestEnv().unauthenticatedContext().firestore() as unknown as Firestore;
}

export function unauthedStorage() {
  return getTestEnv().unauthenticatedContext().storage();
}

export async function seed(ids: SeedIds): Promise<void> {
  await getTestEnv().withSecurityRulesDisabled(async (context) => {
    await seedBaseData(context.firestore() as unknown as Firestore, ids);
  });
}

export { assertFails, assertSucceeds, doc, getDoc, setDoc, updateDoc, deleteDoc };
export { ref, uploadBytes, getBytes, deleteObject };

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(repoRoot, 'firestore.rules'), 'utf8'),
      host: firestoreEmulator.host,
      port: firestoreEmulator.port,
    },
    storage: {
      rules: readFileSync(resolve(repoRoot, 'storage.rules'), 'utf8'),
      host: storageEmulator.host,
      port: storageEmulator.port,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.clearStorage();
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});
