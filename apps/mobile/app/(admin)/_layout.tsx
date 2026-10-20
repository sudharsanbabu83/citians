import { Stack } from 'expo-router';

import { useLogoHeaderOptions } from '@/src/hooks/useLogoHeaderOptions';

export default function AdminLayout() {
  const headerOptions = useLogoHeaderOptions('Admin');

  return (
    <Stack screenOptions={{ ...headerOptions, animation: 'fade_from_bottom', animationDuration: 260, animationMatchesGesture: true }}>
      <Stack.Screen name="index" options={{ title: 'Admin' }} />
    </Stack>
  );
}
