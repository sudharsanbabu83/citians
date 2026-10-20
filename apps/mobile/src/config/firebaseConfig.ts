import { Platform } from 'react-native';
import {
  FIREBASE_ANDROID_API_KEY,
  FIREBASE_ANDROID_APP_ID,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_IOS_API_KEY,
  FIREBASE_IOS_APP_ID,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
} from '@campusflow/shared';

export function getMobileFirebaseConfig() {
  const isIos = Platform.OS === 'ios';

  return {
    apiKey: isIos
      ? (process.env.EXPO_PUBLIC_FIREBASE_IOS_API_KEY ??
        process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
        FIREBASE_IOS_API_KEY)
      : (process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? FIREBASE_ANDROID_API_KEY),
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? FIREBASE_STORAGE_BUCKET,
    messagingSenderId:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? FIREBASE_MESSAGING_SENDER_ID,
    appId: isIos
      ? (process.env.EXPO_PUBLIC_FIREBASE_IOS_APP_ID ?? FIREBASE_IOS_APP_ID)
      : (process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? FIREBASE_ANDROID_APP_ID),
  };
}
