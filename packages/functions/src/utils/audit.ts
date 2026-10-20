import { FieldValue } from 'firebase-admin/firestore';
import type { AuditAction } from '@campusflow/shared';
import { COLLECTIONS } from '@campusflow/shared';
import { db } from './firebase';

export interface AuditLogEntry {
  actorUserId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<string> {
  const { metadata, ...baseEntry } = entry;
  const ref = await db.collection(COLLECTIONS.AUDIT_LOGS).add({
    ...baseEntry,
    ...(metadata === undefined ? {} : { metadata }),
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
