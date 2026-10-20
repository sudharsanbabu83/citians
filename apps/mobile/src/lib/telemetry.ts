import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { ClientErrorFeature, ClientErrorSeverity, ReportClientErrorInput } from '@campusflow/shared';

import { auth, reportClientErrorCallable } from '@/src/config/firebase';

const recentlySent = new Map<string, number>();
const DEDUPE_MS = 30_000;

function errorDetails(error: unknown): { message: string; code?: string } {
  if (error instanceof Error) {
    return { message: error.message || error.name, ...('code' in error ? { code: String(error.code) } : {}) };
  }
  if (typeof error === 'object' && error !== null) {
    const value = error as { message?: unknown; code?: unknown };
    return {
      message: typeof value.message === 'string' ? value.message : 'Unknown application failure',
      ...(value.code ? { code: String(value.code) } : {}),
    };
  }
  return { message: String(error || 'Unknown application failure') };
}

export async function reportAppError(
  error: unknown,
  details: {
    feature: ClientErrorFeature;
    operation: string;
    severity?: ClientErrorSeverity;
    route?: string;
    context?: ReportClientErrorInput['context'];
  }
): Promise<void> {
  if (!auth.currentUser) return;
  const parsed = errorDetails(error);
  const dedupeKey = `${details.feature}|${details.operation}|${parsed.code ?? ''}|${parsed.message}`;
  const now = Date.now();
  if (now - (recentlySent.get(dedupeKey) ?? 0) < DEDUPE_MS) return;
  recentlySent.set(dedupeKey, now);

  try {
    await reportClientErrorCallable({
      ...parsed,
      feature: details.feature,
      operation: details.operation,
      severity: details.severity ?? 'ERROR',
      platform: Platform.OS,
      appVersion: Application.nativeApplicationVersion ?? undefined,
      buildVersion: Application.nativeBuildVersion ?? undefined,
      deviceModel: Device.modelName ?? undefined,
      osVersion: Device.osVersion ?? undefined,
      route: details.route,
      context: details.context,
    });
  } catch (reportingError) {
    if (__DEV__) console.warn('[Citians] Diagnostic report could not be sent', reportingError);
  }
}

export async function monitorOperation<T>(
  feature: ClientErrorFeature,
  operation: string,
  work: () => Promise<T>,
  context?: ReportClientErrorInput['context']
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    void reportAppError(error, { feature, operation, context });
    throw error;
  }
}
