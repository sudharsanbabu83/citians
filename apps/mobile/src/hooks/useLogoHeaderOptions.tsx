import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { AppHeaderLogo } from '@/src/components/AppHeaderLogo';
import { StackHeaderLeading } from '@/src/components/StackHeaderLeading';
import { useNavigationTheme } from '@/src/hooks/useNavigationTheme';
import { useTheme } from '@/src/hooks/useTheme';

export function buildLogoHeaderOptions(
  title: string | undefined,
  nav: ReturnType<typeof useNavigationTheme>,
  backgroundColor: string
): NativeStackNavigationOptions {
  return {
    ...nav,
    headerShown: true,
    title: title ?? '',
    headerTitleAlign: 'center',
    headerLeft: () => <AppHeaderLogo size={28} />,
    contentStyle: { backgroundColor },
  };
}

export function buildStackLogoHeaderOptions(
  title: string,
  nav: ReturnType<typeof useNavigationTheme>,
  backgroundColor: string
): NativeStackNavigationOptions {
  return {
    ...nav,
    headerShown: true,
    title,
    headerTitleAlign: 'center',
    headerLeft: () => <StackHeaderLeading tintColor={nav.headerTintColor as string} />,
    contentStyle: { backgroundColor },
  };
}

export function useLogoHeaderOptions(title?: string) {
  const nav = useNavigationTheme();
  const { colors } = useTheme();
  return buildLogoHeaderOptions(title, nav, colors.background);
}

export function useStackLogoHeaderOptions(title: string) {
  const nav = useNavigationTheme();
  const { colors } = useTheme();
  return buildStackLogoHeaderOptions(title, nav, colors.background);
}
