import { createHash } from 'crypto';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  COLLECTIONS,
  reportClientErrorInputSchema,
  type SystemHealthCheck,
  type SystemHealthResponse,
  type ActiveUserReportResponse,
} from '@campusflow/shared';

import { assertAuth, assertRole } from '../utils/auth';
import { callableOptions } from '../utils/callableOptions';
import { auth, db, storage } from '../utils/firebase';

const REPORT_WINDOW_MS = 60_000;
const MAX_REPORTS_PER_WINDOW = 12;
const ACTIVE_USER_WINDOW_MS = 2 * 60 * 1000;

function normalizedFingerprint(parts: Array<string | undefined>): string {
  const value = parts
    .filter(Boolean)
    .join('|')
    .toLowerCase()
    .replace(/[0-9a-f]{8,}/g, '#')
    .replace(/\d+/g, '#');
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

function cleanContext(context?: Record<string, string | number | boolean | null>) {
  if (!context) return {};
  return Object.fromEntries(
    Object.entries(context)
      .slice(0, 12)
      .map(([key, value]) => [key.slice(0, 60), typeof value === 'string' ? value.slice(0, 240) : value])
  );
}

export const reportClientError = onCall(callableOptions, async (request) => {
  const user = await assertAuth(request);
  const parsed = reportClientErrorInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message ?? 'Invalid error report.');
  }

  const now = Date.now();
  const limiterRef = db.collection('clientErrorRateLimits').doc(user.uid);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(limiterRef);
    const data = snapshot.data();
    const windowStartedAt = data?.windowStartedAt?.toMillis?.() ?? 0;
    const inCurrentWindow = now - windowStartedAt < REPORT_WINDOW_MS;
    const count = inCurrentWindow ? Number(data?.count ?? 0) : 0;
    if (count >= MAX_REPORTS_PER_WINDOW) {
      throw new HttpsError('resource-exhausted', 'Too many diagnostics were submitted.');
    }
    transaction.set(limiterRef, {
      count: count + 1,
      windowStartedAt: inCurrentWindow ? data?.windowStartedAt : Timestamp.fromMillis(now),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  const report = parsed.data;
  const fingerprint = normalizedFingerprint([
    report.feature,
    report.operation,
    report.code,
    report.message,
    report.appVersion,
  ]);
  const bucket = new Date(now).toISOString().slice(0, 13);
  const reportId = `${fingerprint}_${user.uid.slice(0, 12)}_${bucket}`;
  const reportRef = db.collection(COLLECTIONS.CLIENT_ERROR_REPORTS).doc(reportId);

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(reportRef);
    const firstSeenAt = existing.data()?.firstSeenAt ?? FieldValue.serverTimestamp();
    transaction.set(reportRef, {
      ...report,
      context: cleanContext(report.context),
      userId: user.uid,
      userRole: user.role,
      fingerprint,
      occurrenceCount: FieldValue.increment(1),
      firstSeenAt,
      lastSeenAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  logger.warn('Mobile client failure reported', {
    fingerprint,
    feature: report.feature,
    operation: report.operation,
    severity: report.severity,
    appVersion: report.appVersion,
  });
  return { accepted: true, fingerprint };
});

async function runCheck(
  id: SystemHealthCheck['id'],
  label: string,
  operation: () => Promise<unknown>
): Promise<SystemHealthCheck> {
  const started = Date.now();
  try {
    await operation();
    const latencyMs = Date.now() - started;
    return {
      id,
      label,
      status: latencyMs > 2000 ? 'DEGRADED' : 'HEALTHY',
      latencyMs,
      message: latencyMs > 2000 ? 'Responding slowly' : 'Operational',
    };
  } catch (error) {
    logger.error(`Health check failed: ${id}`, error);
    return { id, label, status: 'DOWN', latencyMs: Date.now() - started, message: 'Check failed' };
  }
}

function iso(value: unknown): string {
  if (value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as Timestamp).toDate().toISOString();
  }
  return new Date(0).toISOString();
}

export const getSystemHealth = onCall(callableOptions, async (request): Promise<SystemHealthResponse> => {
  await assertRole(request, ['ADMIN', 'SUPER_ADMIN']);

  const checks = await Promise.all([
    runCheck('functions', 'Cloud Functions', async () => undefined),
    runCheck('firestore', 'Firestore database', () => db.collection(COLLECTIONS.USERS).limit(1).get()),
    runCheck('auth', 'Firebase Authentication', () => auth.listUsers(1)),
    runCheck('storage', 'Cloud Storage', () => storage.bucket().getMetadata()),
  ]);

  const since = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
  const errorsSnapshot = await db.collection(COLLECTIONS.CLIENT_ERROR_REPORTS)
    .where('lastSeenAt', '>=', since)
    .orderBy('lastSeenAt', 'desc')
    .limit(250)
    .get();

  const byFeature: Record<string, number> = {};
  const affectedUsers = new Set<string>();
  let fatalCount = 0;
  let last24Hours = 0;
  const recentErrors = errorsSnapshot.docs.map((doc) => {
    const data = doc.data();
    const count = Number(data.occurrenceCount ?? 1);
    last24Hours += count;
    affectedUsers.add(String(data.userId));
    byFeature[String(data.feature)] = (byFeature[String(data.feature)] ?? 0) + count;
    if (data.severity === 'FATAL') fatalCount += count;
    return {
      id: doc.id,
      message: String(data.message ?? 'Unknown failure'),
      ...(data.code ? { code: String(data.code) } : {}),
      feature: String(data.feature ?? 'UNKNOWN'),
      operation: String(data.operation ?? 'unknown'),
      severity: data.severity === 'WARNING' || data.severity === 'FATAL' ? data.severity : 'ERROR',
      platform: String(data.platform ?? 'unknown'),
      ...(data.appVersion ? { appVersion: String(data.appVersion) } : {}),
      ...(data.buildVersion ? { buildVersion: String(data.buildVersion) } : {}),
      ...(data.deviceModel ? { deviceModel: String(data.deviceModel) } : {}),
      ...(data.osVersion ? { osVersion: String(data.osVersion) } : {}),
      ...(data.route ? { route: String(data.route) } : {}),
      userId: String(data.userId),
      occurrenceCount: count,
      firstSeenAt: iso(data.firstSeenAt),
      lastSeenAt: iso(data.lastSeenAt),
    };
  });

  const down = checks.some((check) => check.status === 'DOWN');
  const degraded = checks.some((check) => check.status === 'DEGRADED') || fatalCount > 0;
  return {
    status: down ? 'DOWN' : degraded ? 'DEGRADED' : 'HEALTHY',
    timestamp: new Date().toISOString(),
    environment: process.env.FUNCTIONS_EMULATOR === 'true' ? 'emulator' : 'production',
    checks,
    incidents: { last24Hours, affectedUsers: affectedUsers.size, fatalCount, byFeature },
    recentErrors: recentErrors.slice(0, 100),
  };
});

function timestampToIso(value: unknown): string | undefined {
  const millis = value && typeof (value as { toMillis?: unknown }).toMillis === 'function'
    ? (value as { toMillis: () => number }).toMillis()
    : value && typeof (value as { seconds?: unknown }).seconds === 'number'
      ? Number((value as { seconds: number }).seconds) * 1000
      : undefined;
  return millis === undefined ? undefined : new Date(millis).toISOString();
}

export const getActiveUserReport = onCall(
  callableOptions,
  async (request): Promise<ActiveUserReportResponse> => {
    await assertRole(request, ['ADMIN', 'SUPER_ADMIN']);

    const sessionsSnapshot = await db.collection(COLLECTIONS.USER_SESSIONS)
      .orderBy('lastSeenAt', 'desc')
      .limit(500)
      .get();
    const sessionRows: Array<{ id: string; [key: string]: unknown }> = sessionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>),
    }));
    const userIds = sessionRows.map((row) => String(row.userId ?? row.id));

    const [userSnapshots, studentSnapshot, hodSnapshot] = await Promise.all([
      Promise.all(userIds.map((userId) => db.collection(COLLECTIONS.USERS).doc(userId).get())),
      db.collection(COLLECTIONS.STUDENTS).limit(1000).get(),
      db.collection(COLLECTIONS.HODS).limit(1000).get(),
    ]);

    const userMap = new Map(userSnapshots.filter((snapshot) => snapshot.exists).map((snapshot) => [snapshot.id, snapshot.data()!]));
    const departmentMap = new Map<string, string>();
    studentSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.userId && data.departmentId) departmentMap.set(String(data.userId), String(data.departmentId));
    });
    hodSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.userId && data.departmentId) departmentMap.set(String(data.userId), String(data.departmentId));
    });

    const now = Date.now();
    const byFeature: Record<string, number> = {};
    let students = 0;
    let staff = 0;
    const users = sessionRows.flatMap((row) => {
      const userId = String(row.userId ?? row.id);
      const user = userMap.get(userId);
      const lastSeenAt = timestampToIso(row.lastSeenAt);
      if (!user || !lastSeenAt) return [];
      const isActive = now - new Date(lastSeenAt).getTime() <= ACTIVE_USER_WINDOW_MS;
      if (!isActive) return [];

      const role = String(user.role ?? 'UNKNOWN');
      if (role === 'STUDENT') students += 1;
      else staff += 1;
      const feature = String(row.currentFeature ?? 'Unknown');
      byFeature[feature] = (byFeature[feature] ?? 0) + 1;

      return [{
        userId,
        name: String(user.name ?? 'Unknown user'),
        email: String(user.email ?? ''),
        role,
        ...(departmentMap.has(userId) ? { department: departmentMap.get(userId) } : {}),
        ...(row.currentRoute ? { currentRoute: String(row.currentRoute) } : {}),
        ...(row.currentFeature ? { currentFeature: String(row.currentFeature) } : {}),
        ...(row.deviceLabel ? { deviceLabel: String(row.deviceLabel) } : {}),
        lastSeenAt,
        ...(timestampToIso(row.createdAt) ? { sessionStartedAt: timestampToIso(row.createdAt) } : {}),
        ...(row.appVersion ? { appVersion: String(row.appVersion) } : {}),
        ...(row.platform ? { platform: String(row.platform) } : {}),
        isActive,
      }];
    });

    return {
      generatedAt: new Date().toISOString(),
      activeWindowSeconds: ACTIVE_USER_WINDOW_MS / 1000,
      summary: { activeUsers: users.length, students, staff, byFeature },
      users,
    };
  }
);
