import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { auth, storage } from '@/src/config/firebase';

export interface PickedEventPoster {
  uri: string;
  name: string;
  mimeType: 'image/jpeg' | 'image/png';
  size: number;
}

export async function uploadEventPoster(file: PickedEventPoster): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('You must be signed in to upload an event poster.');
  if (file.size > 8 * 1024 * 1024) throw new Error('The event poster must be smaller than 8 MB.');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `eventPosters/${uid}/${Date.now()}_${safeName}`;
  const response = await fetch(file.uri);
  const blob = await response.blob();
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, { contentType: file.mimeType });
  return getDownloadURL(storageRef);
}
