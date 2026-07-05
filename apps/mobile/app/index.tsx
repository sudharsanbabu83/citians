import { Redirect } from 'expo-router';

import { getRoleHomeRoute } from '@/src/lib/auth';
import { useAuthStore } from '@/src/lib/authStore';

export default function Index() {
  const { user, profile, isAuthLoading } = useAuthStore();

  if (isAuthLoading) {
    return null;
  }

  if (!user || !profile) {
    return <Redirect href="/login" />;
  }

  return <Redirect href={getRoleHomeRoute(profile.role)} />;
}
