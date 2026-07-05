import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import {
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_WEB_API_KEY,
  FIREBASE_WEB_APP_ID,
} from '@campusflow/shared';
import type { HealthCheckResponse } from '@campusflow/shared';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? FIREBASE_WEB_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? FIREBASE_WEB_APP_ID,
};

const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-south1');

let emulatorsConnected = false;

export function connectFirebaseEmulators(): void {
  if (emulatorsConnected || !useEmulators) return;

  connectAuthEmulator(auth, 'http://localhost:9095', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8085);
  connectStorageEmulator(storage, 'localhost', 9195);
  connectFunctionsEmulator(functions, 'localhost', 5005);
  emulatorsConnected = true;
}

export const healthCheckCallable = httpsCallable<undefined, HealthCheckResponse>(
  functions,
  'healthCheck'
);

export { httpsCallable };
export { useEmulators };
