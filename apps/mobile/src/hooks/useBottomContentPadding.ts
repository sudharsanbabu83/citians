import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/src/theme';

/** Icon + label area height from the tab bar, excluding safe-area padding. */
export const TAB_BAR_CONTENT_HEIGHT = 52;

type BottomContentPaddingOptions = {
  /** Padding above the safe-area inset. Defaults to spacing.xl. */
  extra?: number;
  /** Add tab bar height for screens rendered inside a tab navigator. */
  includeTabBar?: boolean;
};

/** Minimum bottom inset for gesture nav / home indicator (matches tab bar logic). */
export function useBottomSafeInset(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, Platform.OS === 'android' ? spacing.lg : 0);
}

/**
 * Adaptive bottom padding for scroll content and action buttons so they stay
 * above the system gesture area and optional tab bar.
 */
export function useBottomContentPadding(
  options: BottomContentPaddingOptions = {},
): number {
  const { extra = spacing.xl, includeTabBar = false } = options;
  const bottomInset = useBottomSafeInset();
  const tabBarOffset = includeTabBar
    ? TAB_BAR_CONTENT_HEIGHT + spacing.sm + spacing.xs
    : 0;

  return extra + bottomInset + tabBarOffset;
}
