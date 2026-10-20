import type { ThemeColors } from '@/src/theme/palettes';
import { fontFamilies } from '@/src/theme/fonts';

export function buildShadows(colors: ThemeColors, isDark: boolean) {
  const shadowBase = isDark ? '#000000' : colors.primary;

  return {
    card: {
      shadowColor: shadowBase,
      shadowOffset: { width: 0, height: isDark ? 0 : 2 },
      shadowOpacity: isDark ? 0.18 : 0.09,
      shadowRadius: isDark ? 8 : 10,
      elevation: 3,
    },
    hero: {
      shadowColor: shadowBase,
      shadowOffset: { width: 0, height: isDark ? 0 : 4 },
      shadowOpacity: isDark ? 0.24 : 0.2,
      shadowRadius: isDark ? 14 : 16,
      elevation: 7,
    },
  } as const;
}

export function buildTypography(colors: ThemeColors) {
  return {
    title: {
      fontSize: 24,
      fontWeight: '800' as const,
      fontFamily: fontFamilies.extraBold,
      color: colors.text,
    },
    heading: {
      fontSize: 18,
      fontWeight: '700' as const,
      fontFamily: fontFamilies.bold,
      color: colors.text,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      fontFamily: fontFamilies.body,
      color: colors.text,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400' as const,
      fontFamily: fontFamilies.body,
      color: colors.textMuted,
    },
    label: {
      fontSize: 12,
      fontWeight: '600' as const,
      fontFamily: fontFamilies.semibold,
      color: colors.textMuted,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    display: {
      fontSize: 32,
      fontWeight: '800' as const,
      fontFamily: fontFamilies.displayStrong,
      color: colors.text,
      letterSpacing: -0.7,
    },
    displaySmall: {
      fontSize: 22,
      fontWeight: '700' as const,
      fontFamily: fontFamilies.display,
      color: colors.text,
      letterSpacing: -0.25,
    },
    code: {
      fontSize: 13,
      fontWeight: '400' as const,
      fontFamily: fontFamilies.mono,
      color: colors.text,
    },
  };
}

export type AppTypography = ReturnType<typeof buildTypography>;
export type AppShadows = ReturnType<typeof buildShadows>;
