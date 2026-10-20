import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from '@/src/config/firebase';
import { monitorOperation, reportAppError } from '@/src/lib/telemetry';

export type CanvasDropKind = 'text' | 'voice';
export type CanvasDropTemplate = 'FREEFORM' | 'QUESTION' | 'BRAINSTORM' | 'PROJECT' | 'STUDY';

export interface CanvasDrop {
  id: string;
  kind: CanvasDropKind;
  authorId: string;
  authorName: string;
  text: string;
  audioUrl?: string;
  durationSeconds?: number;
  x: number;
  y: number;
  color: string;
  reactedBy: string[];
  parentId?: string | null;
  template?: CanvasDropTemplate;
  mentions?: string[];
  mentionNames?: string[];
  tags?: string[];
  createdAt?: { toMillis?: () => number } | null;
}

export interface CanvasPerson {
  id: string;
  name: string;
  color: string;
  isTalking: boolean;
  updatedAt?: { toMillis?: () => number } | null;
}

const roomRef = (roomId: string) => doc(db, 'canvasRooms', roomId);
const dropsRef = (roomId: string) => collection(roomRef(roomId), 'drops');
const peopleRef = (roomId: string) => collection(roomRef(roomId), 'presence');

export function subscribeToCanvasDrops(
  roomId: string,
  onValue: (drops: CanvasDrop[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    dropsRef(roomId),
    (snapshot) => {
      const drops = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as CanvasDrop)
        .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
      onValue(drops);
    },
    (error) => {
      void reportAppError(error, { feature: 'CANVAS', operation: 'subscribe_drops', context: { roomId } });
      onError(error);
    },
  );
}

export function subscribeToCanvasPeople(
  roomId: string,
  onValue: (people: CanvasPerson[]) => void,
): () => void {
  return onSnapshot(peopleRef(roomId), (snapshot) => {
    const now = Date.now();
    const people = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }) as CanvasPerson)
      .filter((person) => now - (person.updatedAt?.toMillis?.() ?? now) < 75_000);
    onValue(people);
  });
}

export async function enterCanvasRoom(
  roomId: string,
  user: { id: string; name: string; color: string; isTalking?: boolean },
): Promise<void> {
  await setDoc(roomRef(roomId), { updatedAt: serverTimestamp() }, { merge: true });
  await setDoc(
    doc(peopleRef(roomId), user.id),
    { name: user.name, color: user.color, isTalking: user.isTalking ?? false, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function leaveCanvasRoom(roomId: string, userId: string): Promise<void> {
  await deleteDoc(doc(peopleRef(roomId), userId));
}

export async function setCanvasTalking(roomId: string, userId: string, isTalking: boolean): Promise<void> {
  await updateDoc(doc(peopleRef(roomId), userId), { isTalking, updatedAt: serverTimestamp() });
}

export async function createCanvasDrop(
  roomId: string,
  drop: Omit<CanvasDrop, 'id' | 'createdAt'>,
): Promise<string> {
  return monitorOperation('CANVAS', 'create_drop', async () => {
    const target = doc(dropsRef(roomId));
    await setDoc(target, { ...drop, createdAt: serverTimestamp() });
    return target.id;
  }, { roomId, kind: drop.kind });
}

export async function moveCanvasDrop(roomId: string, dropId: string, x: number, y: number): Promise<void> {
  await updateDoc(doc(dropsRef(roomId), dropId), { x, y });
}

export async function toggleCanvasReaction(
  roomId: string,
  dropId: string,
  userId: string,
  reacted: boolean,
): Promise<void> {
  await updateDoc(doc(dropsRef(roomId), dropId), {
    reactedBy: reacted ? arrayRemove(userId) : arrayUnion(userId),
  });
}

export async function uploadCanvasVoice(
  roomId: string,
  userId: string,
  localUri: string,
): Promise<string> {
  return monitorOperation('CANVAS', 'upload_voice', async () => {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const target = ref(storage, `canvasRooms/${roomId}/voice/${userId}-${Date.now()}.m4a`);
    await uploadBytes(target, blob, { contentType: blob.type || 'audio/mp4' });
    return getDownloadURL(target);
  }, { roomId });
}
