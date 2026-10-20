import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_ACTIVITY_KEY = '@campusflow/lastActivityAt';

/** Sign out after 30 days without opening the app. */
export const SESSION_INACTIVITY_MS = 30 * 24 * 60 * 60 * 1000;

export async function getLastActivityAt(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function recordActivity(): Promise<void> {
  await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export async function clearActivity(): Promise<void> {
  await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
}

export async function isSessionExpired(
  maxInactiveMs: number = SESSION_INACTIVITY_MS
): Promise<boolean> {
  const lastActivityAt = await getLastActivityAt();
  if (lastActivityAt === null) return false;
  return Date.now() - lastActivityAt > maxInactiveMs;
}
