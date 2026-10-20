import { ViewStyle } from 'react-native';

import {
  TAB_BAR_CONTENT_HEIGHT,
  useBottomSafeInset,
} from '@/src/hooks/useBottomContentPadding';
import { useTheme } from '@/src/hooks/useTheme';
import { spacing } from '@/src/theme';

/**
 * Adaptive bottom tab bar styles that respect device safe areas
 * (iOS home indicator, Android gesture / 3-button navigation bar).
 */
export function useTabBarStyle(): ViewStyle {
  const { colors } = useTheme();
  const bottomInset = useBottomSafeInset();
  const paddingTop = spacing.sm;
  const paddingBottom = bottomInset + spacing.xs;

  return {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.accentBorder,
    borderTopWidth: 1,
    paddingTop,
    paddingBottom,
    height: TAB_BAR_CONTENT_HEIGHT + paddingTop + paddingBottom,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 14,
  };
}
