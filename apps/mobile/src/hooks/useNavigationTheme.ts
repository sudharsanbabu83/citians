import { useTabBarStyle } from '@/src/hooks/useTabBarStyle';
import { useTheme } from '@/src/hooks/useTheme';
import { fontFamilies } from '@/src/theme/fonts';

/** Shared animated, colorful stack/tab chrome. */
export function useNavigationTheme() {
  const { colors } = useTheme();
  const tabBarStyle = useTabBarStyle();

  return {
    headerStyle: { backgroundColor: colors.navBackground },
    headerTintColor: colors.navForeground,
    headerTitleStyle: {
      fontWeight: '800' as const,
      fontFamily: fontFamilies.extraBold,
      fontSize: 18,
      color: colors.navForeground,
    },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal' as const,
    tabBarActiveTintColor: colors.tabActive,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarActiveBackgroundColor: colors.accentBg,
    tabBarStyle,
    tabBarItemStyle: {
      borderRadius: 16,
      marginHorizontal: 3,
      marginVertical: 3,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '700' as const,
      fontFamily: fontFamilies.bold,
    },
  };
}
