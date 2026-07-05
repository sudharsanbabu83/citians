import { Platform, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/src/theme';

/** Icon + label area height, excluding safe-area padding. */
const TAB_BAR_CONTENT_HEIGHT = 52;

/**
 * Adaptive bottom tab bar styles that respect device safe areas
 * (iOS home indicator, Android gesture / 3-button navigation bar).
 */
export function useTabBarStyle(): ViewStyle {
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? spacing.lg : 0,
  );
  const paddingTop = spacing.sm;
  const paddingBottom = bottomInset + spacing.xs;

  return {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    paddingTop,
    paddingBottom,
    height: TAB_BAR_CONTENT_HEIGHT + paddingTop + paddingBottom,
  };
}
