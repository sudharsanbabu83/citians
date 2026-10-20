import { FieldValue } from 'firebase-admin/firestore';

import { COLLECTIONS } from '@campusflow/shared';
import { db } from './firebase';

const COUNTER_PATH = 'citianIdCounter';
const FIRST_ID = 1234;

/** Allocates a human-friendly ID atomically; gaps are safe if account creation fails later. */
export async function allocateCitianId(): Promise<string> {
  const counterRef = db.collection(COLLECTIONS.SYSTEM).doc(COUNTER_PATH);
  const number = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const lastNumber = snapshot.exists ? Number(snapshot.data()?.lastNumber ?? FIRST_ID - 1) : FIRST_ID - 1;
    const nextNumber = lastNumber + 1;
    transaction.set(counterRef, { lastNumber: nextNumber, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return nextNumber;
  });
  return `citian@${String(number).padStart(4, '0')}`;
}
