import { buildShadows, buildTypography } from '@/src/theme/builders';
import { lightColors } from '@/src/theme/palettes';

/** @deprecated Use `useTheme()` for theme-aware screens. */
export const colors = lightColors;

/** @deprecated Use `useTheme()` for theme-aware screens. */
export const shadows = buildShadows(lightColors, false);

/** @deprecated Use `useTheme()` for theme-aware screens. */
export const typography = buildTypography(lightColors);

export { lightColors, darkColors, batmanColors } from '@/src/theme/palettes';
export type { ThemeColors } from '@/src/theme/palettes';
export { buildShadows, buildTypography } from '@/src/theme/builders';
export { fontFamilies } from '@/src/theme/fonts';
export type { FontPurpose } from '@/src/theme/fonts';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;
