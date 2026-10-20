import { useFonts } from 'expo-font';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Platform, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { healthCheckCallable } from '@/src/config/firebase';
import { SplashScreenView } from '@/src/components/SplashScreenView';
import { useNavigationTheme } from '@/src/hooks/useNavigationTheme';
import { useTheme } from '@/src/hooks/useTheme';
import { usePushRegistration } from '@/src/hooks/usePushRegistration';
import { useSessionActivity } from '@/src/hooks/useSessionActivity';
import { useAuthStore } from '@/src/lib/authStore';
import { useThemeStore } from '@/src/lib/themeStore';
import { useAppStore } from '@/src/lib/store';
import { reportAppError } from '@/src/lib/telemetry';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 180, fade: true });

const queryClient = new QueryClient();

function RootNavigator() {
  const { colors, isDark } = useTheme();
  const nav = useNavigationTheme();
  const { width } = useWindowDimensions();
  const bounded = width >= 768;

  return (
    <View style={[styles.viewport, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.appFrame, bounded && styles.boundedFrame, bounded && Platform.OS === 'web' && styles.webFrame]}>
        <Stack
          screenOptions={{
            ...nav,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade_from_bottom',
            animationDuration: 280,
            animationMatchesGesture: true,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(student)" options={{ headerShown: false }} />
          <Stack.Screen name="(hod)" options={{ headerShown: false }} />
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          <Stack.Screen name="(competitions-admin)" options={{ headerShown: false }} />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, alignItems: 'center' },
  appFrame: { flex: 1, width: '100%' },
  boundedFrame: { maxWidth: 1040 },
  webFrame: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(100, 90, 130, 0.14)',
    shadowColor: '#1E1630',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

  const { setHealthCheck, setHealthError, setIsCheckingHealth } = useAppStore();
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const initializeTheme = useThemeStore((s) => s.initializeTheme);
  const themeReady = useThemeStore((s) => s.isReady);
  const [isNativeSplashHidden, setIsNativeSplashHidden] = useState(false);
  const [isBrandAnimationComplete, setIsBrandAnimationComplete] = useState(false);

  usePushRegistration();
  useSessionActivity();

  useEffect(() => {
    const unsubscribe = initializeTheme();
    return unsubscribe;
  }, [initializeTheme]);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return unsubscribe;
  }, [initializeAuth]);

  useEffect(() => {
    healthCheckCallable()
      .then((result) => {
        setHealthCheck(result.data);
        setHealthError(null);
      })
      .catch((err: Error) => {
        setHealthError(err.message ?? 'Failed to reach Cloud Functions');
        void reportAppError(err, { feature: 'APP_STARTUP', operation: 'health_check' });
      })
      .finally(() => setIsCheckingHealth(false));
  }, [setHealthCheck, setHealthError, setIsCheckingHealth]);

  useEffect(() => {
    if (loaded && !isAuthLoading && themeReady && !isNativeSplashHidden) {
      setIsNativeSplashHidden(true);
      requestAnimationFrame(() => SplashScreen.hide());
    }
  }, [isNativeSplashHidden, loaded, isAuthLoading, themeReady]);

  if (!loaded || isAuthLoading || !themeReady || !isNativeSplashHidden) {
    return null;
  }

  if (!isBrandAnimationComplete) {
    return <SplashScreenView onAnimationComplete={() => setIsBrandAnimationComplete(true)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
