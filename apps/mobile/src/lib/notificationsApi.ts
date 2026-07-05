import { markNotificationReadInputSchema } from '@campusflow/shared';

import { markNotificationReadCallable } from '@/src/config/firebase';

export async function markNotificationRead(notificationId: string): Promise<void> {
  const validated = markNotificationReadInputSchema.parse({ notificationId });
  await markNotificationReadCallable(validated);
}
