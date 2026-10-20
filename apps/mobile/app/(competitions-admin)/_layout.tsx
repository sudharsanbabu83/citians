import { Redirect, Stack } from 'expo-router';

import { useStackLogoHeaderOptions } from '@/src/hooks/useLogoHeaderOptions';
import { getRoleHomeRoute } from '@/src/lib/auth';
import { useAuthStore } from '@/src/lib/authStore';

export default function CompetitionsAdminLayout() {
  const createHeader = useStackLogoHeaderOptions('Add Competition');
  const detailHeader = useStackLogoHeaderOptions('Competition');
  const { user, profile, isAuthLoading } = useAuthStore();

  if (!isAuthLoading && !user) {
    return <Redirect href="/login" />;
  }

  if (!isAuthLoading && profile && profile.role !== 'COMPETITIONS_ADMIN') {
    return <Redirect href={getRoleHomeRoute(profile.role)} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom', animationDuration: 260, animationMatchesGesture: true }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="competitions/create" options={createHeader} />
      <Stack.Screen name="competitions/[id]" options={detailHeader} />
    </Stack>
  );
}
