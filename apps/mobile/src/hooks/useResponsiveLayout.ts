import { useMemo } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';

import { spacing } from '@/src/theme';

const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1180;
const COMPACT_BREAKPOINT = 360;

/** Shared responsive measurements for native, tablet and web layouts. */
export function useResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const isCompact = width < COMPACT_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT;
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const gutter = isCompact ? spacing.sm + 2 : isTablet ? spacing.lg : spacing.md;

  return useMemo(() => ({
    width,
    height,
    fontScale,
    isCompact,
    isTablet,
    isDesktop,
    gutter,
    readableContentStyle: {
      width: '100%',
      maxWidth: 920,
      alignSelf: 'center',
    } satisfies ViewStyle,
    formContentStyle: {
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
    } satisfies ViewStyle,
  }), [fontScale, gutter, height, isCompact, isDesktop, isTablet, width]);
}

