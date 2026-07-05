import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/src/lib/authStore';
import { colors } from '@/src/theme';

export default function HodLayout() {
  const { user, profile, isAuthLoading } = useAuthStore();

  if (!isAuthLoading && !user) {
    return <Redirect href="/login" />;
  }

  if (!isAuthLoading && profile && profile.role !== 'HOD') {
    if (profile.role === 'STUDENT') return <Redirect href="/(student)/(tabs)" />;
    if (profile.role === 'ADMIN') return <Redirect href="/(admin)" />;
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="od/[id]"
        options={{
          headerShown: true,
          title: 'Review OD Request',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
        }}
      />
      <Stack.Screen
        name="scan"
        options={{
          headerShown: true,
          title: 'Scan OD Pass',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: true,
          title: 'Notifications',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
        }}
      />
    </Stack>
  );
}
