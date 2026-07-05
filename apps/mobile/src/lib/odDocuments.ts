import * as DocumentPicker from 'expo-document-picker';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { deleteObject, ref, uploadBytes } from 'firebase/storage';
import type { ODDocument } from '@campusflow/shared';
import {
  ALLOWED_FILE_TYPES,
  COLLECTIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_REQUEST,
} from '@campusflow/shared';

import { auth, db, storage } from '@/src/config/firebase';

export interface PickedODFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface ODDocumentWithId extends ODDocument {
  id: string;
}

const ALLOWED_MIME_TYPES = new Set<string>(ALLOWED_FILE_TYPES);

function normalizeMimeType(mimeType: string | undefined, fileName: string): string {
  if (mimeType && ALLOWED_MIME_TYPES.has(mimeType)) {
    return mimeType;
  }
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  throw new Error('Only PDF, PNG, and JPEG files are allowed.');
}

export async function pickODDocuments(existingCount = 0): Promise<PickedODFile[]> {
  const remaining = MAX_FILES_PER_REQUEST - existingCount;
  if (remaining <= 0) {
    throw new Error(`Maximum ${MAX_FILES_PER_REQUEST} files allowed.`);
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/png', 'image/jpeg'],
    multiple: remaining > 1,
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    return [];
  }

  const assets = result.assets.slice(0, remaining);
  const picked: PickedODFile[] = [];

  for (const asset of assets) {
    const size = asset.size ?? 0;
    if (size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`${asset.name} exceeds the 10 MB limit.`);
    }
    const mimeType = normalizeMimeType(asset.mimeType, asset.name);
    picked.push({
      uri: asset.uri,
      name: asset.name,
      mimeType,
      size,
    });
  }

  return picked;
}

export async function uploadODDocument(
  requestId: string,
  file: PickedODFile
): Promise<{ docId: string; storagePath: string }> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('You must be signed in to upload documents.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `odRequests/${requestId}/documents/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  const response = await fetch(file.uri);
  const blob = await response.blob();
  await uploadBytes(storageRef, blob, { contentType: file.mimeType });

  const docRef = await addDoc(collection(db, COLLECTIONS.OD_REQUESTS, requestId, 'documents'), {
    fileName: file.name,
    fileType: file.mimeType as ODDocument['fileType'],
    fileSize: file.size,
    storagePath,
    uploadedBy: uid,
    uploadedAt: serverTimestamp(),
  });

  return { docId: docRef.id, storagePath };
}

export async function saveDocumentMetadata(
  requestId: string,
  docId: string,
  metadata: Omit<ODDocument, 'uploadedAt'>
): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.OD_REQUESTS, requestId, 'documents', docId), {
    ...metadata,
    uploadedAt: serverTimestamp(),
  });
}

export async function fetchRequestDocuments(requestId: string): Promise<ODDocumentWithId[]> {
  const snapshot = await getDocs(
    collection(db, COLLECTIONS.OD_REQUESTS, requestId, 'documents')
  );
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as ODDocument),
  }));
}

export async function deleteODDocument(
  requestId: string,
  docId: string,
  storagePath: string
): Promise<void> {
  await deleteObject(ref(storage, storagePath));
  await deleteDoc(doc(db, COLLECTIONS.OD_REQUESTS, requestId, 'documents', docId));
}
