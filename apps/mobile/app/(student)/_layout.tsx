import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/src/lib/authStore';
import { colors } from '@/src/theme';

export default function StudentLayout() {
  const { user, profile, isAuthLoading } = useAuthStore();

  if (!isAuthLoading && !user) {
    return <Redirect href="/login" />;
  }

  if (!isAuthLoading && profile && profile.role !== 'STUDENT') {
    if (profile.role === 'HOD') return <Redirect href="/(hod)/(tabs)" />;
    if (profile.role === 'ADMIN') return <Redirect href="/(admin)" />;
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="od/apply"
        options={{
          headerShown: true,
          title: 'Apply for OD',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
        }}
      />
      <Stack.Screen
        name="od/[id]"
        options={{
          headerShown: true,
          title: 'OD Request',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
        }}
      />
      <Stack.Screen
        name="od/pass/[requestId]"
        options={{
          headerShown: true,
          title: 'Digital OD Pass',
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
