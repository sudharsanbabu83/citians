import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { ODRequest } from '@campusflow/shared';
import { COLLECTIONS, submitODRequestInputSchema } from '@campusflow/shared';
import { z } from 'zod';

import { db, submitODRequestCallable } from '@/src/config/firebase';

export type ODFormInput = z.infer<typeof submitODRequestInputSchema>;

export interface DraftRequestInput {
  studentUserId: string;
  departmentId: string;
  hodUserId: string;
  eventName: string;
  purpose: string;
  organizer: string;
  location: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export async function resolveHodUserId(departmentId: string): Promise<string> {
  const snap = await getDoc(doc(db, COLLECTIONS.DEPARTMENTS, departmentId));
  if (!snap.exists()) {
    throw new Error(
      `Department "${departmentId}" is not set up. While emulators are running, run: npm run seed`
    );
  }
  const hodId = snap.data().hodId as string | undefined;
  if (!hodId) {
    throw new Error('No HOD assigned to your department.');
  }
  return hodId;
}

export async function createDraftRequest(input: DraftRequestInput): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.OD_REQUESTS), {
    studentId: input.studentUserId,
    studentUserId: input.studentUserId,
    departmentId: input.departmentId,
    hodUserId: input.hodUserId,
    eventName: input.eventName,
    purpose: input.purpose,
    organizer: input.organizer,
    location: input.location,
    startDate: input.startDate,
    endDate: input.endDate,
    reason: input.reason,
    status: 'DRAFT',
    submittedAt: null,
    reviewedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDraftRequest(
  requestId: string,
  input: Omit<DraftRequestInput, 'studentUserId' | 'departmentId' | 'hodUserId'>,
  currentStatus: ODRequest['status']
): Promise<void> {
  const payload: Record<string, unknown> = {
    eventName: input.eventName,
    purpose: input.purpose,
    organizer: input.organizer,
    location: input.location,
    startDate: input.startDate,
    endDate: input.endDate,
    reason: input.reason,
    updatedAt: serverTimestamp(),
  };

  if (currentStatus === 'DRAFT') {
    payload.status = 'DRAFT';
  }

  await updateDoc(doc(db, COLLECTIONS.OD_REQUESTS, requestId), payload);
}

export async function submitODRequest(input: ODFormInput): Promise<{ requestId: string; status: string }> {
  const normalized = {
    ...input,
    documentIds: input.documentIds ?? undefined,
  };
  const validated = submitODRequestInputSchema.parse(normalized);
  const result = await submitODRequestCallable(validated);
  return result.data;
}
