import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { usePathname } from 'expo-router';

import { useAuthStore } from '@/src/lib/authStore';
import { isSessionExpired, recordActivity } from '@/src/lib/sessionActivity';
import { refreshDeviceSession } from '@/src/lib/sessionApi';

export function useSessionActivity(): void {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const pathname = usePathname();

  const currentFeature = pathname.includes('events')
    ? 'Events'
    : pathname.includes('competitions')
      ? 'Competitions'
      : pathname.includes('network-feed')
        ? 'Network Feed'
        : pathname.includes('network')
          ? 'Campus Network'
          : pathname.includes('doubts') || pathname.includes('/build')
            ? 'Doubt Exchange'
            : pathname.includes('canvas')
              ? 'Canvas'
              : pathname.includes('leetcode')
                ? 'Code Together'
                : pathname.includes('resume-builder')
                  ? 'Resume Builder'
                  : pathname.includes('focus-blocker')
                    ? 'Focus Mode'
                    : pathname.includes('tech-pulse')
                      ? 'Tech Pulse'
                      : pathname.includes('tools')
                        ? 'Tools'
                        : pathname.includes('profile')
                          ? 'Profile'
                          : 'Home';

  useEffect(() => {
    if (!user) return;

    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState !== 'active') {
        await recordActivity();
        return;
      }

      if (await isSessionExpired()) {
        await signOut();
        return;
      }

      try {
        await refreshDeviceSession({ currentRoute: pathname, currentFeature });
      } catch {
        await signOut();
        return;
      }

      await recordActivity();
    };

    void refreshDeviceSession({ currentRoute: pathname, currentFeature }).catch(() => undefined);
    void recordActivity();
    const heartbeat = setInterval(() => {
      if (AppState.currentState === 'active') {
        void refreshDeviceSession({ currentRoute: pathname, currentFeature }).catch(() => undefined);
        void recordActivity();
      }
    }, 45_000);
    const subscription = AppState.addEventListener('change', (nextState) => {
      void handleAppStateChange(nextState);
    });

    return () => {
      subscription.remove();
      clearInterval(heartbeat);
    };
  }, [user, signOut, pathname, currentFeature]);
}
