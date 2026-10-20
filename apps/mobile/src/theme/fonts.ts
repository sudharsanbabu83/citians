/**
 * Purpose-driven typography roles.
 *
 * Keep components pointed at a semantic role instead of a font name so the
 * app can evolve its visual voice without another page-by-page rewrite.
 */
export const fontFamilies = {
  body: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
  display: 'BricolageGrotesque_700Bold',
  displayStrong: 'BricolageGrotesque_800ExtraBold',
  mono: 'SpaceMono',
} as const;

export type FontPurpose = keyof typeof fontFamilies;
