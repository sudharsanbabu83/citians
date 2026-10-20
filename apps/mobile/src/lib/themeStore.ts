import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, type ColorSchemeName } from 'react-native';
import { create } from 'zustand';

import { buildShadows, buildTypography } from '@/src/theme/builders';
import { batmanColors, darkColors, lightColors, type ThemeColors } from '@/src/theme/palettes';

export type ThemePreference = 'light' | 'dark' | 'system' | 'batman';

const STORAGE_KEY = '@citians/theme-preference';

export interface AppTheme {
  colors: ThemeColors;
  shadows: ReturnType<typeof buildShadows>;
  typography: ReturnType<typeof buildTypography>;
  isDark: boolean;
}

function resolveIsDark(preference: ThemePreference, systemScheme: ColorSchemeName | null | undefined) {
  if (preference === 'system') {
    return systemScheme === 'dark';
  }
  return preference === 'dark';
}

function buildTheme(preference: ThemePreference, systemScheme: ColorSchemeName | null | undefined): AppTheme {
  const isBatman = preference === 'batman';
  const isDark = isBatman || resolveIsDark(preference, systemScheme);
  const colors = isBatman ? batmanColors : isDark ? darkColors : lightColors;
  return {
    colors,
    shadows: buildShadows(colors, isDark),
    typography: buildTypography(colors),
    isDark,
  };
}

interface ThemeState {
  preference: ThemePreference;
  systemScheme: ColorSchemeName | null;
  theme: AppTheme;
  isReady: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
  initializeTheme: () => () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: 'light',
  systemScheme: Appearance.getColorScheme() ?? 'light',
  theme: buildTheme('light', 'light'),
  isReady: false,

  setPreference: async (preference) => {
    await AsyncStorage.setItem(STORAGE_KEY, preference);
    const systemScheme = get().systemScheme;
    set({ preference, theme: buildTheme(preference, systemScheme) });
  },

  initializeTheme: () => {
    let mounted = true;

    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const preference =
          stored === 'light' || stored === 'dark' || stored === 'system' || stored === 'batman' ? stored : 'light';
        const systemScheme = Appearance.getColorScheme() ?? 'light';
        if (!mounted) return;
        set({
          preference,
          systemScheme,
          theme: buildTheme(preference, systemScheme),
          isReady: true,
        });
      } catch {
        if (!mounted) return;
        set({ isReady: true });
      }
    })();

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const { preference } = get();
      set({
        systemScheme: colorScheme,
        theme: buildTheme(preference, colorScheme),
      });
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  },
}));
