import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/src/lib/authStore';

export default function AuthLayout() {
  const { user, profile, isAuthLoading } = useAuthStore();

  if (!isAuthLoading && user && profile) {
    if (profile.role === 'STUDENT') return <Redirect href="/(student)/(tabs)" />;
    if (profile.role === 'HOD') return <Redirect href="/(hod)/(tabs)" />;
    if (profile.role === 'ADMIN') return <Redirect href="/(admin)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
