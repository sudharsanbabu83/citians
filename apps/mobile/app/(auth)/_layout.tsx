import { Redirect, Stack } from 'expo-router';

import { getRoleHomeRoute } from '@/src/lib/auth';
import { useAuthStore } from '@/src/lib/authStore';

export default function AuthLayout() {
  const { user, profile, needsProfileSetup, isAuthLoading } = useAuthStore();

  if (!isAuthLoading && user && profile && !needsProfileSetup) {
    return <Redirect href={getRoleHomeRoute(profile.role)} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 240, animationTypeForReplace: 'push' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="setup-profile" />
    </Stack>
  );
}
