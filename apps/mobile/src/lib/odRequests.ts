import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type { ODRequest, ODRequestStatus } from '@campusflow/shared';
import { COLLECTIONS } from '@campusflow/shared';

import { db } from '@/src/config/firebase';
import { colors } from '@/src/theme';

export interface ODRequestWithId extends ODRequest {
  id: string;
}

export interface StudentODStats {
  approved: number;
  pending: number;
  rejected: number;
}

/**
 * Dashboard stat mapping:
 * - Approved → APPROVED
 * - Pending → PENDING_HOD_REVIEW, CHANGES_REQUESTED, DRAFT
 * - Rejected → REJECTED
 * REVOKED is excluded from overview stats.
 */
const APPROVED_STATUSES: ODRequestStatus[] = ['APPROVED'];
const PENDING_STATUSES: ODRequestStatus[] = [
  'PENDING_HOD_REVIEW',
  'CHANGES_REQUESTED',
  'DRAFT',
];
const REJECTED_STATUSES: ODRequestStatus[] = ['REJECTED'];

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const ts = value as { toDate: () => Date };
    return ts.toDate();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const ts = value as { seconds: number };
    return new Date(ts.seconds * 1000);
  }
  return null;
}

export function formatRequestDate(value: unknown): string {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) return startDate;
  return `${startDate} – ${endDate}`;
}

export function formatODStatus(status: ODRequestStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'PENDING_HOD_REVIEW':
      return 'Pending Review';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'CHANGES_REQUESTED':
      return 'Changes Requested';
    case 'REVOKED':
      return 'Revoked';
    default:
      return status;
  }
}

export function getStatusColor(status: ODRequestStatus): {
  text: string;
  bg: string;
} {
  switch (status) {
    case 'APPROVED':
      return { text: colors.success, bg: colors.successBg };
    case 'REJECTED':
    case 'REVOKED':
      return { text: colors.error, bg: colors.errorBg };
    case 'PENDING_HOD_REVIEW':
    case 'CHANGES_REQUESTED':
    case 'DRAFT':
      return { text: colors.warning, bg: colors.warningBg };
    default:
      return { text: colors.textMuted, bg: colors.background };
  }
}

export function computeStudentODStats(requests: ODRequest[]): StudentODStats {
  return requests.reduce(
    (acc, req) => {
      if (APPROVED_STATUSES.includes(req.status)) acc.approved += 1;
      else if (PENDING_STATUSES.includes(req.status)) acc.pending += 1;
      else if (REJECTED_STATUSES.includes(req.status)) acc.rejected += 1;
      return acc;
    },
    { approved: 0, pending: 0, rejected: 0 }
  );
}

function mapDocToRequest(id: string, data: ODRequest): ODRequestWithId {
  return { id, ...data };
}

export async function fetchStudentODRequests(
  studentUserId: string,
  maxResults = 10
): Promise<ODRequestWithId[]> {
  const q = query(
    collection(db, COLLECTIONS.OD_REQUESTS),
    where('studentUserId', '==', studentUserId),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapDocToRequest(d.id, d.data() as ODRequest));
}

export async function fetchODRequestById(requestId: string): Promise<ODRequestWithId | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.OD_REQUESTS, requestId));
  if (!snap.exists()) return null;
  return mapDocToRequest(snap.id, snap.data() as ODRequest);
}

export async function fetchHodPendingCount(departmentId: string): Promise<number> {
  const q = query(
    collection(db, COLLECTIONS.OD_REQUESTS),
    where('departmentId', '==', departmentId),
    where('status', '==', 'PENDING_HOD_REVIEW'),
    limit(50)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}

export interface HodPendingRequest extends ODRequestWithId {
  studentName: string;
}

async function resolveStudentName(
  studentUserId: string,
  storedName?: string
): Promise<string> {
  if (storedName) return storedName;

  try {
    const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, studentUserId));
    if (userSnap.exists()) {
      return (userSnap.data().name as string) ?? 'Student';
    }
  } catch {
    // Fall back when rules deny the read or the network fails.
  }

  return 'Student';
}

export async function fetchHodPendingRequests(
  departmentId: string,
  maxResults = 20
): Promise<HodPendingRequest[]> {
  const q = query(
    collection(db, COLLECTIONS.OD_REQUESTS),
    where('departmentId', '==', departmentId),
    where('status', '==', 'PENDING_HOD_REVIEW'),
    orderBy('submittedAt', 'desc'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);

  return Promise.all(
    snapshot.docs.map(async (d) => {
      const request = mapDocToRequest(d.id, d.data() as ODRequest);
      const studentName = await resolveStudentName(
        request.studentUserId,
        (d.data().studentName as string | undefined) ?? undefined
      );
      return { ...request, studentName };
    })
  );
}
