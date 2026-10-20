import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type {
  ConnectionRequestWithId,
  ConnectionWithId,
  NetworkConversationWithId,
  NetworkMessageWithId,
  NetworkProfile,
  NetworkProfileWithId,
  NetworkPost,
  NetworkPostWithId,
} from '@campusflow/shared';
import { COLLECTIONS, networkPostSchema, networkProfileSchema } from '@campusflow/shared';

import { db } from '@/src/config/firebase';

export type ConnectionState = 'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'CONNECTED' | 'BLOCKED';

export function connectionId(a: string, b: string): string {
  return [a, b].sort().join('__');
}

export function requestId(from: string, to: string): string { return `${from}__${to}`; }

export async function fetchNetworkProfiles(): Promise<NetworkProfileWithId[]> {
  const snapshot = await getDocs(query(
    collection(db, COLLECTIONS.NETWORK_PROFILES),
    where('visibility', '==', 'COLLEGE_ONLY'),
    limit(300)
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as NetworkProfileWithId));
}

export async function fetchOwnNetworkProfile(userId: string): Promise<NetworkProfileWithId | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.NETWORK_PROFILES, userId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as NetworkProfileWithId) : null;
}

export async function saveNetworkProfile(input: NetworkProfile): Promise<void> {
  const parsed = networkProfileSchema.parse(input);
  await setDoc(doc(db, COLLECTIONS.NETWORK_PROFILES, input.userId), {
    ...parsed,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function fetchNetworkState(userId: string): Promise<{
  requests: ConnectionRequestWithId[];
  connections: ConnectionWithId[];
  blockedIds: string[];
}> {
  const [sent, received, connected, blocked] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.CONNECTION_REQUESTS), where('requesterId', '==', userId), limit(100))),
    getDocs(query(collection(db, COLLECTIONS.CONNECTION_REQUESTS), where('recipientId', '==', userId), limit(100))),
    getDocs(query(collection(db, COLLECTIONS.CONNECTIONS), where('userIds', 'array-contains', userId), limit(100))),
    getDocs(query(collection(db, COLLECTIONS.BLOCKED_USERS), where('blockerId', '==', userId), limit(100))),
  ]);
  const requests = [...sent.docs, ...received.docs].map((item) => ({ id: item.id, ...item.data() } as ConnectionRequestWithId));
  return {
    requests,
    connections: connected.docs.map((item) => ({ id: item.id, ...item.data() } as ConnectionWithId)),
    blockedIds: blocked.docs.map((item) => item.data().blockedId as string),
  };
}

export function getConnectionState(userId: string, targetId: string, state: Awaited<ReturnType<typeof fetchNetworkState>>): ConnectionState {
  if (state.blockedIds.includes(targetId)) return 'BLOCKED';
  if (state.connections.some((item) => item.userIds.includes(targetId))) return 'CONNECTED';
  const sent = state.requests.find((item) => item.requesterId === userId && item.recipientId === targetId && item.status === 'PENDING');
  if (sent) return 'REQUEST_SENT';
  const received = state.requests.find((item) => item.requesterId === targetId && item.recipientId === userId && item.status === 'PENDING');
  if (received) return 'REQUEST_RECEIVED';
  return 'NONE';
}

export async function sendConnectionRequest(from: string, to: string): Promise<void> {
  if (from === to) throw new Error('You cannot connect with yourself.');
  const reverseRef = doc(db, COLLECTIONS.CONNECTION_REQUESTS, requestId(to, from));
  const forwardRef = doc(db, COLLECTIONS.CONNECTION_REQUESTS, requestId(from, to));
  const reverse = await getDoc(reverseRef);
  if (reverse.exists() && reverse.data().status === 'PENDING') {
    const batch = writeBatch(db);
    batch.update(reverseRef, { status: 'ACCEPTED', updatedAt: serverTimestamp() });
    batch.set(doc(db, COLLECTIONS.CONNECTIONS, connectionId(from, to)), { userIds: [from, to].sort(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await batch.commit();
    return;
  }
  await setDoc(forwardRef, { requesterId: from, recipientId: to, status: 'PENDING', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function respondToConnectionRequest(request: ConnectionRequestWithId, accept: boolean): Promise<void> {
  const requestRef = doc(db, COLLECTIONS.CONNECTION_REQUESTS, request.id);
  if (!accept) {
    await updateDoc(requestRef, { status: 'REJECTED', updatedAt: serverTimestamp() });
    return;
  }
  const batch = writeBatch(db);
  batch.update(requestRef, { status: 'ACCEPTED', updatedAt: serverTimestamp() });
  batch.set(doc(db, COLLECTIONS.CONNECTIONS, connectionId(request.requesterId, request.recipientId)), { userIds: [request.requesterId, request.recipientId].sort(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function cancelConnectionRequest(request: ConnectionRequestWithId): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.CONNECTION_REQUESTS, request.id), { status: 'CANCELLED', updatedAt: serverTimestamp() });
}

export async function removeConnection(userId: string, otherId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.CONNECTIONS, connectionId(userId, otherId)));
}

export async function blockUser(userId: string, otherId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTIONS.BLOCKED_USERS, `${userId}__${otherId}`), { blockerId: userId, blockedId: otherId, createdAt: serverTimestamp() });
  batch.delete(doc(db, COLLECTIONS.CONNECTIONS, connectionId(userId, otherId)));
  batch.delete(doc(db, COLLECTIONS.CONNECTION_REQUESTS, requestId(userId, otherId)));
  batch.delete(doc(db, COLLECTIONS.CONNECTION_REQUESTS, requestId(otherId, userId)));
  await batch.commit();
}

export async function unblockUser(userId: string, otherId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.BLOCKED_USERS, `${userId}__${otherId}`));
}

export async function reportProfile(reporterId: string, targetUserId: string, reason: string): Promise<void> {
  const reportRef = doc(collection(db, COLLECTIONS.PROFILE_REPORTS));
  await setDoc(reportRef, { reporterId, targetUserId, reason: reason.trim(), status: 'OPEN', createdAt: serverTimestamp() });
}

export async function fetchConversation(userId: string, otherId: string): Promise<NetworkMessageWithId[]> {
  const snapshot = await getDocs(query(
    collection(db, COLLECTIONS.NETWORK_CONVERSATIONS, connectionId(userId, otherId), COLLECTIONS.NETWORK_MESSAGES),
    orderBy('createdAt', 'asc'),
    limit(100)
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as NetworkMessageWithId));
}

export async function sendNetworkMessage(userId: string, otherId: string, body: string): Promise<void> {
  const conversationId = connectionId(userId, otherId);
  const conversationRef = doc(db, COLLECTIONS.NETWORK_CONVERSATIONS, conversationId);
  const messageRef = doc(collection(db, COLLECTIONS.NETWORK_CONVERSATIONS, conversationId, COLLECTIONS.NETWORK_MESSAGES));
  const batch = writeBatch(db);
  batch.set(conversationRef, { memberIds: [userId, otherId].sort(), lastMessage: body.trim(), lastMessageAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
  batch.set(messageRef, { conversationId, senderId: userId, body: body.trim(), createdAt: serverTimestamp() });
  await batch.commit();
}

export async function fetchConversations(userId: string): Promise<NetworkConversationWithId[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.NETWORK_CONVERSATIONS), where('memberIds', 'array-contains', userId), orderBy('updatedAt', 'desc'), limit(50)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as NetworkConversationWithId));
}

export async function fetchNetworkPosts(): Promise<NetworkPostWithId[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.NETWORK_POSTS), where('isActive', '==', true), limit(100)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as NetworkPostWithId)).sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
}

export async function createNetworkPost(input: Omit<NetworkPost, 'likedByUserIds' | 'commentCount' | 'flagCount' | 'isActive' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const parsed = networkPostSchema.omit({ likedByUserIds: true, commentCount: true, flagCount: true, isActive: true, createdAt: true, updatedAt: true }).parse(input);
  const ref = doc(collection(db, COLLECTIONS.NETWORK_POSTS));
  await setDoc(ref, { ...parsed, likedByUserIds: [], commentCount: 0, flagCount: 0, isActive: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function toggleNetworkPostLike(post: NetworkPostWithId, userId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.NETWORK_POSTS, post.id), { likedByUserIds: post.likedByUserIds.includes(userId) ? arrayRemove(userId) : arrayUnion(userId), updatedAt: serverTimestamp() });
}

export async function commentOnNetworkPost(postId: string, authorId: string, authorName: string, body: string): Promise<void> {
  const postRef = doc(db, COLLECTIONS.NETWORK_POSTS, postId);
  const post = await getDoc(postRef);
  if (!post.exists() || post.data().isActive !== true) throw new Error('This post is no longer available.');
  const commentRef = doc(collection(db, COLLECTIONS.NETWORK_POST_COMMENTS));
  const batch = writeBatch(db);
  batch.set(commentRef, { postId, authorId, authorName, body: body.trim(), createdAt: serverTimestamp() });
  batch.update(postRef, { commentCount: Number(post.data().commentCount ?? 0) + 1, updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function fetchNetworkPostComments(postId: string): Promise<Array<{ id: string; authorId: string; authorName: string; body: string; createdAt?: unknown }>> {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.NETWORK_POST_COMMENTS), where('postId', '==', postId), limit(100)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as { authorId: string; authorName: string; body: string; createdAt?: unknown }) })).sort((a, b) => getMillis(a.createdAt) - getMillis(b.createdAt));
}

export async function flagNetworkPost(postId: string, reporterId: string, reason: string): Promise<void> {
  const postRef = doc(db, COLLECTIONS.NETWORK_POSTS, postId);
  const post = await getDoc(postRef);
  if (!post.exists() || post.data().isActive !== true) throw new Error('This post is no longer available.');
  const flagRef = doc(db, COLLECTIONS.NETWORK_POST_FLAGS, `${postId}_${reporterId}`);
  if ((await getDoc(flagRef)).exists()) throw new Error('You have already reported this post.');
  const batch = writeBatch(db);
  batch.set(flagRef, { postId, reporterId, reason, createdAt: serverTimestamp() });
  batch.update(postRef, { flagCount: Number(post.data().flagCount ?? 0) + 1, updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function deleteNetworkPost(postId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.NETWORK_POSTS, postId), { isActive: false, updatedAt: serverTimestamp() });
}

function getMillis(value: unknown): number {
  const timestamp = value as { toDate?: () => Date } | Date | undefined;
  const date = timestamp instanceof Date ? timestamp : timestamp?.toDate?.();
  return date?.getTime() ?? 0;
}
