import { useEffect } from 'react';

import { useAuthStore } from '@/src/lib/authStore';
import { registerForPushNotifications } from '@/src/lib/pushNotifications';

export function usePushRegistration() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.uid) return;
    registerForPushNotifications(user.uid).catch((err) => {
      if (__DEV__) {
        console.log('[Citians] Push registration failed:', (err as Error).message);
      }
    });
  }, [user?.uid]);
}
