import {
  claimUserSessionCallable,
  refreshUserSessionCallable,
  releaseUserSessionCallable,
} from '@/src/config/firebase';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getDeviceSessionId, getDeviceSessionLabel } from '@/src/lib/deviceSession';

async function buildSessionPayload() {
  const [sessionId, deviceLabel] = await Promise.all([
    getDeviceSessionId(),
    getDeviceSessionLabel(),
  ]);

  return {
    sessionId,
    deviceLabel,
    platform: Platform.OS,
    appVersion: Application.nativeApplicationVersion ?? undefined,
    buildVersion: Application.nativeBuildVersion ?? undefined,
    osVersion: Device.osVersion ?? undefined,
  };
}

export async function claimDeviceSession(): Promise<void> {
  const payload = await buildSessionPayload();
  await claimUserSessionCallable(payload);
}

export async function refreshDeviceSession(details?: {
  currentRoute?: string;
  currentFeature?: string;
}): Promise<void> {
  const sessionId = await getDeviceSessionId();
  await refreshUserSessionCallable({ sessionId, ...details });
}

export async function releaseDeviceSession(): Promise<void> {
  const sessionId = await getDeviceSessionId();
  await releaseUserSessionCallable({ sessionId });
}
