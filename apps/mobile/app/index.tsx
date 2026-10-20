import { Redirect } from 'expo-router';

import { getRoleHomeRoute, SETUP_PROFILE_ROUTE } from '@/src/lib/auth';
import { useAuthStore } from '@/src/lib/authStore';

export default function Index() {
  const { user, profile, needsProfileSetup, isAuthLoading } = useAuthStore();

  if (isAuthLoading) {
    return null;
  }

  if (!user || !profile) {
    return <Redirect href="/(student)/(tabs)" />;
  }

  if (needsProfileSetup) {
    return <Redirect href={SETUP_PROFILE_ROUTE} />;
  }

  return <Redirect href={getRoleHomeRoute(profile.role)} />;
}
