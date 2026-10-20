import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolves the host the mobile app should use to reach Firebase emulators on the dev PC.
 *
 * - Web / iOS simulator: localhost
 * - Android emulator: 10.0.2.2 (when no Expo debugger host is available)
 * - Physical device (Expo Go / Dev Client): LAN IP from Expo's debuggerHost (Metro bundler address)
 * - Override anytime with EXPO_PUBLIC_EMULATOR_HOST in .env
 */
export function getEmulatorHost(): string {
  const extra = Constants.expoConfig?.extra;
  const configured =
    extra?.emulatorHost ?? process.env.EXPO_PUBLIC_EMULATOR_HOST ?? 'localhost';

  if (configured && configured !== 'localhost' && configured !== '127.0.0.1') {
    return configured;
  }

  if (Platform.OS === 'web') {
    return 'localhost';
  }

  const debuggerHost = resolveDebuggerHost();
  if (debuggerHost) {
    return debuggerHost;
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  return 'localhost';
}

function resolveDebuggerHost(): string | null {
  const expoGo = Constants.expoGoConfig as { debuggerHost?: string } | null;
  const candidates = [
    expoGo?.debuggerHost,
    Constants.expoConfig?.hostUri,
    (Constants.manifest2 as { extra?: { expoClient?: { hostUri?: string } } } | null)?.extra
      ?.expoClient?.hostUri,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const host = candidate.split(':')[0]?.trim();
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }

  return null;
}
