import { NativeModules, Platform } from 'react-native';

type FocusBlockerNative = {
  openAccessibilitySettings: () => void;
  isAccessibilityEnabled: () => Promise<boolean>;
  setBlock: (packages: string[], endsAt: number) => void;
  clearBlock: () => void;
};

export const focusBlockerNative: FocusBlockerNative | null = Platform.OS === 'android'
  ? NativeModules.FocusBlocker ?? null
  : null;

