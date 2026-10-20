import { router } from 'expo-router';
import { Alert } from 'react-native';

import { useAuthStore } from '@/src/lib/authStore';

/** Prompts guests at the point where they try to participate. */
export function useLoginRequired() {
  const user = useAuthStore((state) => state.user);

  return (action: string): boolean => {
    if (user) return true;

    Alert.alert('Sign in to continue', `Sign in to ${action}.`, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Sign in', onPress: () => router.push('/login') },
    ]);
    return false;
  };
}
