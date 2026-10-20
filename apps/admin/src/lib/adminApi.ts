import { provisionUserInputSchema } from '@campusflow/shared';

import { functions, httpsCallable } from '../config/firebase';

const provisionUserCallable = httpsCallable(functions, 'provisionUser');

export async function provisionUser(input: unknown): Promise<{ uid: string; email: string; role: string }> {
  const validated = provisionUserInputSchema.parse(input);
  const result = await provisionUserCallable(validated);
  return result.data as { uid: string; email: string; role: string };
}

export async function cancelEvent(eventId: string, reason?: string): Promise<void> {
  const cancelEventCallable = httpsCallable(functions, 'cancelEvent');
  await cancelEventCallable({ eventId, reason });
}

export async function approveEvent(eventId: string, reason?: string): Promise<void> {
  const callable = httpsCallable(functions, 'approveEvent');
  await callable({ eventId, reason });
}

export async function rejectEvent(eventId: string, reason: string): Promise<void> {
  const callable = httpsCallable(functions, 'rejectEvent');
  await callable({ eventId, reason });
}

export async function setUserAccountStatus(
  userId: string,
  isActive: boolean,
  reason: string
): Promise<void> {
  const callable = httpsCallable(functions, 'setUserAccountStatus');
  await callable({ userId, isActive, reason });
}

export async function moderateWorkPost(
  postId: string,
  action: 'REMOVE' | 'RESTORE',
  reason: string
): Promise<void> {
  const callable = httpsCallable(functions, 'moderateWorkPost');
  await callable({ postId, action, reason });
}

export async function moderateCanvasDrop(roomId: string, dropId: string, reason: string): Promise<void> {
  const callable = httpsCallable(functions, 'moderateCanvasDrop');
  await callable({ roomId, dropId, reason });
}

export async function createOfficialWorkPost(input: {
  title: string;
  description: string;
  category: string;
}): Promise<void> {
  const callable = httpsCallable(functions, 'createOfficialWorkPost');
  await callable(input);
}
