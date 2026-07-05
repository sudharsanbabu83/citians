import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { registerDeviceTokenCallable } from '@/src/config/firebase';

/** Expo Go (SDK 53+) does not support remote push — Dev Client required for FCM. */
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

function getStableDeviceId(): string {
  if (Platform.OS === 'android') {
    return Application.getAndroidId() ?? `android-${Constants.sessionId ?? 'unknown'}`;
  }
  return `${Platform.OS}-${Constants.sessionId ?? 'unknown'}`;
}

async function resolveDeviceId(): Promise<string> {
  if (Platform.OS === 'ios') {
    try {
      const iosId = await Application.getIosIdForVendorAsync();
      if (iosId) return iosId;
    } catch {
      // Fall through to session-based id.
    }
  }
  return getStableDeviceId();
}

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!userId) return;

  if (isExpoGo()) {
    if (__DEV__) {
      console.log(
        '[CampusFlow] Push skipped in Expo Go. In-app notifications still work; use a Dev Client build for FCM.'
      );
    }
    return;
  }

  const Device = await import('expo-device');
  if (!Device.isDevice) {
    if (__DEV__) {
      console.log('[CampusFlow] Push registration skipped on simulator/emulator.');
    }
    return;
  }

  const Notifications = await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) {
      console.log('[CampusFlow] Push permission not granted.');
    }
    return;
  }

  let pushToken: string;
  try {
    const tokenResult = await Notifications.getDevicePushTokenAsync();
    pushToken = tokenResult.data;
    if (__DEV__) {
      console.log(`[CampusFlow] Native push token (${tokenResult.type}) acquired.`);
    }
  } catch (err) {
    if (__DEV__) {
      console.log('[CampusFlow] Could not get native push token:', (err as Error).message);
    }
    return;
  }

  if (pushToken.startsWith('ExponentPushToken')) {
    if (__DEV__) {
      console.log('[CampusFlow] Unexpected Expo push token; native FCM/APNs token required.');
    }
    return;
  }

  const deviceId = await resolveDeviceId();
  const appVersion = Application.nativeApplicationVersion ?? '1.0.0';
  const platform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  await registerDeviceTokenCallable({
    fcmToken: pushToken,
    platform,
    deviceId,
    appVersion,
  });

  if (__DEV__) {
    console.log('[CampusFlow] Device token registered for notifications.');
  }
}
