import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const DEVICE_SESSION_ID_KEY = '@campusflow/deviceSessionId';

function generateSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}

export async function getDeviceSessionId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_SESSION_ID_KEY);
  if (existing) return existing;

  const sessionId = generateSessionId();
  await AsyncStorage.setItem(DEVICE_SESSION_ID_KEY, sessionId);
  return sessionId;
}

export async function getDeviceSessionLabel(): Promise<string> {
  const model = Device.modelName ?? Device.deviceName ?? 'Unknown device';
  const os = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS;
  return `${model} (${os})`;
}
