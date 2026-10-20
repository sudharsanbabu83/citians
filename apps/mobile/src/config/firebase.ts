import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type {
  CreateEventResult,
  CreateCompetitionResult,
  EventCheckInResult,
  EventTicketPayload,
  HealthCheckResponse,
  RegisterForEventResult,
  ReportClientErrorInput,
  ApproveEventRegistrationsBatchResult,
} from '@campusflow/shared';
import { getEmulatorHost } from '@/src/config/emulatorHost';
import { getMobileFirebaseConfig } from '@/src/config/firebaseConfig';

const firebaseConfig = getMobileFirebaseConfig();

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

function createAuth(firebaseApp: FirebaseApp): Auth {
  if (Platform.OS === 'web') {
    return getAuth(firebaseApp);
  }

  const nativeAuth = require('@firebase/auth') as {
    initializeAuth: typeof import('firebase/auth').initializeAuth;
    getAuth: typeof import('firebase/auth').getAuth;
    getReactNativePersistence: (
      storage: typeof AsyncStorage
    ) => import('firebase/auth').Persistence;
  };

  const { initializeAuth, getReactNativePersistence, getAuth: getNativeAuth } = nativeAuth;

  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'auth/already-initialized') {
      return getNativeAuth(firebaseApp);
    }
    throw error;
  }
}

const extra = Constants.expoConfig?.extra;
export const useEmulators = extra?.useEmulators ?? process.env.EXPO_PUBLIC_USE_EMULATORS === 'true';

/** Resolved emulator host (useful for dev UI / debugging). */
export let resolvedEmulatorHost: string | null = null;

const EMULATORS_CONNECTED_KEY = '__campusflow_emulators_connected__';

function isEmulatorAlreadyConnected(): boolean {
  return Boolean((globalThis as unknown as Record<string, boolean>)[EMULATORS_CONNECTED_KEY]);
}

function markEmulatorsConnected(): void {
  (globalThis as unknown as Record<string, boolean>)[EMULATORS_CONNECTED_KEY] = true;
}

function connectEmulatorService(connect: () => void, alreadyConnectedCodes: string[]): void {
  try {
    connect();
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code && alreadyConnectedCodes.includes(code)) {
      if (__DEV__) {
        console.log(`[Citians] Emulator already configured (${code})`);
      }
      return;
    }
    throw error;
  }
}

export const auth = createAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-south1');

export function connectFirebaseEmulators(): void {
  if (!useEmulators || isEmulatorAlreadyConnected()) return;

  const host = getEmulatorHost();
  resolvedEmulatorHost = host;

  if (__DEV__) {
    console.log(`[Citians] Firebase emulators → ${host} (auth:9095, firestore:8085, functions:5005)`);
  }

  connectEmulatorService(
    () => connectAuthEmulator(auth, `http://${host}:9095`, { disableWarnings: true }),
    ['auth/emulator-config-failed']
  );
  connectEmulatorService(
    () => connectFirestoreEmulator(db, host, 8085),
    ['failed-precondition']
  );
  connectEmulatorService(
    () => connectStorageEmulator(storage, host, 9195),
    ['storage/emulator-config-failed']
  );
  connectEmulatorService(
    () => connectFunctionsEmulator(functions, host, 5005),
    ['functions/emulator-config-failed']
  );

  markEmulatorsConnected();
}

if (useEmulators) {
  connectFirebaseEmulators();
}

export { getEmulatorHost };

export const healthCheckCallable = httpsCallable<undefined, HealthCheckResponse>(
  functions,
  'healthCheck'
);

export const registerDeviceTokenCallable = httpsCallable<
  Record<string, unknown>,
  { success: boolean }
>(functions, 'registerDeviceToken');

export const markNotificationReadCallable = httpsCallable<
  Record<string, unknown>,
  { success: boolean }
>(functions, 'markNotificationRead');

export const createEventCallable = httpsCallable<
  Record<string, unknown>,
  CreateEventResult
>(functions, 'createEvent');

export const cancelEventCallable = httpsCallable<
  Record<string, unknown>,
  { eventId: string; status: string }
>(functions, 'cancelEvent');

export const registerForEventCallable = httpsCallable<
  Record<string, unknown>,
  RegisterForEventResult
>(functions, 'registerForEvent');

export const unregisterFromEventCallable = httpsCallable<
  Record<string, unknown>,
  { eventId: string; status: string }
>(functions, 'unregisterFromEvent');

export const approveEventRegistrationCallable = httpsCallable<
  { registrationId: string },
  { registrationId: string; status: string }
>(functions, 'approveEventRegistration');

export const rejectEventRegistrationCallable = httpsCallable<
  { registrationId: string; reason?: string },
  { registrationId: string; status: string }
>(functions, 'rejectEventRegistration');

export const removeEventAttendeeCallable = httpsCallable<
  { registrationId: string; reason?: string },
  { registrationId: string; status: string }
>(functions, 'removeEventAttendee');

export const approveAllEventRegistrationsCallable = httpsCallable<
  { eventId: string },
  ApproveEventRegistrationsBatchResult
>(functions, 'approveAllEventRegistrations');

export const getEventTicketCallable = httpsCallable<{ eventId: string }, EventTicketPayload>(
  functions,
  'getEventTicket'
);

export const reportClientErrorCallable = httpsCallable<
  ReportClientErrorInput,
  { accepted: boolean; fingerprint: string }
>(functions, 'reportClientError');

export const checkInEventAttendeeCallable = httpsCallable<
  { registrationId: string; ticketToken: string },
  EventCheckInResult
>(functions, 'checkInEventAttendee');

export const publishEventAnnouncementCallable = httpsCallable<
  Record<string, unknown>,
  { announcementId: string; recipientCount: number; deliveredCount: number }
>(functions, 'publishEventAnnouncement');

export const acknowledgeEventAnnouncementCallable = httpsCallable<
  { announcementId: string },
  { announcementId: string; acknowledged: boolean }
>(functions, 'acknowledgeEventAnnouncement');

export const createCompetitionCallable = httpsCallable<
  Record<string, unknown>,
  CreateCompetitionResult
>(functions, 'createCompetition');

export const updateCompetitionCallable = httpsCallable<
  Record<string, unknown>,
  { competitionId: string; status: string }
>(functions, 'updateCompetition');

export const cancelCompetitionCallable = httpsCallable<
  Record<string, unknown>,
  { competitionId: string; status: string }
>(functions, 'cancelCompetition');

export const claimUserSessionCallable = httpsCallable<
  Record<string, unknown>,
  { success: boolean }
>(functions, 'claimUserSession');

export const refreshUserSessionCallable = httpsCallable<
  Record<string, unknown>,
  { success: boolean }
>(functions, 'refreshUserSession');

export const releaseUserSessionCallable = httpsCallable<
  Record<string, unknown>,
  { success: boolean }
>(functions, 'releaseUserSession');

export { app };
