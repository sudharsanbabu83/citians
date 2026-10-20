import { Redirect, Stack } from 'expo-router';

import { useStackLogoHeaderOptions } from '@/src/hooks/useLogoHeaderOptions';
import { useAuthStore } from '@/src/lib/authStore';

export default function HodLayout() {
  const notificationsHeader = useStackLogoHeaderOptions('Notifications');
  const { user, profile, isAuthLoading } = useAuthStore();

  if (!isAuthLoading && !user) {
    return <Redirect href="/login" />;
  }

  if (!isAuthLoading && profile && profile.role !== 'HOD') {
    if (profile.role === 'STUDENT') return <Redirect href="/(student)/(tabs)" />;
    if (profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN') return <Redirect href="/(admin)" />;
    if (profile.role === 'COMPETITIONS_ADMIN') return <Redirect href="/(competitions-admin)/(tabs)" />;
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom', animationDuration: 260, animationMatchesGesture: true }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="notifications" options={notificationsHeader} />
    </Stack>
  );
}
