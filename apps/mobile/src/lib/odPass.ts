import type { ODPassQrPayload, VerifyODPassResponse } from '@campusflow/shared';
import { getODPassQrPayloadInputSchema } from '@campusflow/shared';
import Constants from 'expo-constants';
import { z } from 'zod';

import { FIREBASE_PROJECT_ID } from '@campusflow/shared';
import { getEmulatorHost, getODPassQrPayloadCallable, useEmulators } from '@/src/config/firebase';

export type GetODPassInput = z.infer<typeof getODPassQrPayloadInputSchema>;

export async function fetchODPassQrPayload(requestId: string): Promise<ODPassQrPayload> {
  const validated = getODPassQrPayloadInputSchema.parse({ requestId });
  const result = await getODPassQrPayloadCallable(validated);
  return result.data;
}

export function getVerifyPassBaseUrl(): string {
  const projectId =
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ??
    Constants.expoConfig?.extra?.firebaseProjectId ??
    FIREBASE_PROJECT_ID;

  if (useEmulators) {
    const host = getEmulatorHost();
    return `http://${host}:5005/${projectId}/asia-south1/verifyODPass`;
  }

  return `https://asia-south1-${projectId}.cloudfunctions.net/verifyODPass`;
}

export async function verifyODPassRemote(
  approvalId: string,
  token: string
): Promise<VerifyODPassResponse> {
  const url = getVerifyPassBaseUrl();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvalId, token }),
  });

  if (!response.ok && response.status === 404) {
    return { verificationStatus: 'INVALID' };
  }

  return (await response.json()) as VerifyODPassResponse;
}

export function parseQrScanPayload(data: string): { approvalId: string; token: string } | null {
  try {
    const queryMatch = data.match(/approvalId=([^&]+)&token=([^&]+)/);
    if (queryMatch) {
      return {
        approvalId: decodeURIComponent(queryMatch[1]!),
        token: decodeURIComponent(queryMatch[2]!),
      };
    }

    const parsed = JSON.parse(data) as { approvalId?: string; token?: string };
    if (parsed.approvalId && parsed.token) {
      return { approvalId: parsed.approvalId, token: parsed.token };
    }
  } catch {
    return null;
  }

  return null;
}

export function mapVerifyStatus(status: VerifyODPassResponse['verificationStatus']): {
  label: string;
  color: string;
  bg: string;
} {
  switch (status) {
    case 'VALID':
      return { label: 'Valid OD Pass', color: '#15803D', bg: '#DCFCE7' };
    case 'REVOKED':
      return { label: 'Revoked', color: '#B91C1C', bg: '#FEE2E2' };
    case 'EXPIRED':
      return { label: 'Expired', color: '#B45309', bg: '#FEF3C7' };
    case 'TAMPERED':
      return { label: 'Tampered / Invalid', color: '#B91C1C', bg: '#FEE2E2' };
    default:
      return { label: 'Invalid Pass', color: '#B91C1C', bg: '#FEE2E2' };
  }
}
