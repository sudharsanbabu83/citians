import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import Constants from 'expo-constants';
import type { HealthCheckResponse, ODPassQrPayload } from '@campusflow/shared';
import {
  FIREBASE_ANDROID_API_KEY,
  FIREBASE_ANDROID_APP_ID,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
} from '@campusflow/shared';

import { getEmulatorHost } from '@/src/config/emulatorHost';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? FIREBASE_ANDROID_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? FIREBASE_ANDROID_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-south1');

const extra = Constants.expoConfig?.extra;
export const useEmulators = extra?.useEmulators ?? process.env.EXPO_PUBLIC_USE_EMULATORS === 'true';

/** Resolved emulator host (useful for dev UI / debugging). */
export let resolvedEmulatorHost: string | null = null;

let emulatorsConnected = false;

export function connectFirebaseEmulators(): void {
  if (emulatorsConnected || !useEmulators) return;

  const host = getEmulatorHost();
  resolvedEmulatorHost = host;

  if (__DEV__) {
    console.log(`[CampusFlow] Firebase emulators → ${host} (auth:9095, firestore:8085, functions:5005)`);
  }

  connectAuthEmulator(auth, `http://${host}:9095`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8085);
  connectStorageEmulator(storage, host, 9195);
  connectFunctionsEmulator(functions, host, 5005);
  emulatorsConnected = true;
}

export { getEmulatorHost };

export const healthCheckCallable = httpsCallable<undefined, HealthCheckResponse>(
  functions,
  'healthCheck'
);

export interface SubmitODRequestResult {
  requestId: string;
  status: string;
}

export const submitODRequestCallable = httpsCallable<
  Record<string, unknown>,
  SubmitODRequestResult
>(functions, 'submitODRequest');

export interface HodReviewResult {
  requestId: string;
  status: string;
  studentUserId: string;
}

export const approveODRequestCallable = httpsCallable<
  Record<string, unknown>,
  HodReviewResult
>(functions, 'approveODRequest');

export const rejectODRequestCallable = httpsCallable<
  Record<string, unknown>,
  HodReviewResult
>(functions, 'rejectODRequest');

export const requestODChangesCallable = httpsCallable<
  Record<string, unknown>,
  HodReviewResult
>(functions, 'requestODChanges');

export const getODPassQrPayloadCallable = httpsCallable<
  Record<string, unknown>,
  ODPassQrPayload
>(functions, 'getODPassQrPayload');

export const registerDeviceTokenCallable = httpsCallable<
  Record<string, unknown>,
  { success: boolean }
>(functions, 'registerDeviceToken');

export const markNotificationReadCallable = httpsCallable<
  Record<string, unknown>,
  { success: boolean }
>(functions, 'markNotificationRead');

export { app };
