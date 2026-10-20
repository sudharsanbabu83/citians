import { useThemeStore } from '@/src/lib/themeStore';

export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const isReady = useThemeStore((s) => s.isReady);

  return {
    ...theme,
    preference,
    setPreference,
    isReady,
  };
}
