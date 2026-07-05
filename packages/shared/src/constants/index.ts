export const ROLES = ['STUDENT', 'HOD', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const OD_REQUEST_STATUSES = [
  'DRAFT',
  'PENDING_HOD_REVIEW',
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
  'REVOKED',
] as const;
export type ODRequestStatus = (typeof OD_REQUEST_STATUSES)[number];

export const OD_PASS_STATUSES = ['ACTIVE', 'REVOKED', 'EXPIRED'] as const;
export type ODPassStatus = (typeof OD_PASS_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'OD_SUBMITTED',
  'OD_APPROVED',
  'OD_REJECTED',
  'OD_CHANGES_REQUESTED',
  'OD_PASS_GENERATED',
  'OD_PASS_REVOKED',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const VERIFICATION_RESULTS = [
  'VALID',
  'INVALID',
  'REVOKED',
  'EXPIRED',
  'TAMPERED',
] as const;
export type VerificationResult = (typeof VERIFICATION_RESULTS)[number];

export const COLLECTIONS = {
  USERS: 'users',
  STUDENTS: 'students',
  HODS: 'hods',
  DEPARTMENTS: 'departments',
  OD_REQUESTS: 'odRequests',
  OD_PASSES: 'odPasses',
  OD_PASS_SECRETS: 'odPassSecrets',
  NOTIFICATIONS: 'notifications',
  DEVICE_TOKENS: 'deviceTokens',
  VERIFICATION_LOGS: 'verificationLogs',
  AUDIT_LOGS: 'auditLogs',
} as const;

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
] as const;

export const MAX_FILES_PER_REQUEST = 5;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const AUDIT_ACTIONS = {
  OD_SUBMITTED: 'OD_SUBMITTED',
  OD_APPROVED: 'OD_APPROVED',
  OD_REJECTED: 'OD_REJECTED',
  OD_CHANGES_REQUESTED: 'OD_CHANGES_REQUESTED',
  OD_PASS_REVOKED: 'OD_PASS_REVOKED',
  OD_PASS_VERIFIED: 'OD_PASS_VERIFIED',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/** CIT Chennai — only @citchennai.net emails may sign in to CampusFlow. */
export const COLLEGE_EMAIL_DOMAIN = 'citchennai.net';

export function isCollegeEmail(email: string, domain = COLLEGE_EMAIL_DOMAIN): boolean {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1) return false;
  return normalized.slice(atIndex + 1) === domain.toLowerCase();
}

export * from './firebase';
