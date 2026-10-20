import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  type DocumentData,
} from 'firebase/firestore';
import { COLLECTIONS } from '@campusflow/shared';

import { db } from '../config/firebase';

export async function listCollection<T extends DocumentData>(
  collectionName: string,
  max = 100,
  orderField = 'createdAt'
): Promise<Array<T & { id: string }>> {
  try {
    const q = query(collection(db, collectionName), orderBy(orderField, 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
  } catch {
    const snap = await getDocs(collection(db, collectionName));
    return snap.docs.slice(0, max).map((d) => ({ id: d.id, ...(d.data() as T) }));
  }
}

export async function getDocument<T extends DocumentData>(
  collectionName: string,
  id: string
): Promise<(T & { id: string }) | null> {
  const snap = await getDoc(doc(db, collectionName, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as T) };
}

export async function upsertDocument(
  collectionName: string,
  id: string,
  data: Record<string, unknown>,
  merge = true
): Promise<void> {
  await setDoc(
    doc(db, collectionName, id),
    { ...data, updatedAt: serverTimestamp() },
    { merge }
  );
}

export async function patchDocument(
  collectionName: string,
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  await updateDoc(doc(db, collectionName, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

export async function listCanvasDrops<T extends DocumentData>(max = 200): Promise<Array<T & { id: string; roomId: string }>> {
  const rooms = await getDocs(collection(db, COLLECTIONS.CANVAS_ROOMS));
  const roomDrops = await Promise.all(rooms.docs.map(async (room) => {
    const drops = await getDocs(query(collection(db, COLLECTIONS.CANVAS_ROOMS, room.id, 'drops'), limit(max)));
    return drops.docs.map((item) => ({ id: item.id, roomId: room.id, ...(item.data() as T) }));
  }));
  return roomDrops.flat().slice(0, max);
}

export { COLLECTIONS };
