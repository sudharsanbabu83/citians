import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { connectFirebaseEmulators, healthCheckCallable } from '@/src/config/firebase';
import { usePushRegistration } from '@/src/hooks/usePushRegistration';
import { useAuthStore } from '@/src/lib/authStore';
import { useAppStore } from '@/src/lib/store';
import { colors } from '@/src/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const { setHealthCheck, setHealthError, setIsCheckingHealth } = useAppStore();
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  usePushRegistration();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    connectFirebaseEmulators();
    const unsubscribe = initializeAuth();
    return unsubscribe;
  }, [initializeAuth]);

  useEffect(() => {
    connectFirebaseEmulators();

    healthCheckCallable()
      .then((result) => {
        setHealthCheck(result.data);
        setHealthError(null);
      })
      .catch((err: Error) => {
        setHealthError(err.message ?? 'Failed to reach Cloud Functions');
      })
      .finally(() => setIsCheckingHealth(false));
  }, [setHealthCheck, setHealthError, setIsCheckingHealth]);

  useEffect(() => {
    if (loaded && !isAuthLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isAuthLoading]);

  if (!loaded || isAuthLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: colors.white,
            headerTitleStyle: { fontWeight: '600' },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(student)" options={{ headerShown: false }} />
          <Stack.Screen name="(hod)" options={{ headerShown: false }} />
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
