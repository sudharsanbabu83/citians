export const ROLES = ['STUDENT', 'HOD', 'ADMIN', 'COMPETITIONS_ADMIN', 'SUPER_ADMIN'] as const;
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

export const EVENT_TYPES = ['EVENT', 'HACKATHON', 'WORKSHOP', 'MEETUP'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_STATUSES = ['DRAFT', 'PENDING_ADMIN_REVIEW', 'PUBLISHED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_APPROVAL_MODES = ['AUTO', 'MANUAL'] as const;
export type EventApprovalMode = (typeof EVENT_APPROVAL_MODES)[number];

export const EVENT_REGISTRATION_STATUSES = [
  'REGISTERED',
  'PENDING',
  'WAITLISTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'ATTENDED',
] as const;
export type EventRegistrationStatus = (typeof EVENT_REGISTRATION_STATUSES)[number];

export const EVENT_ANNOUNCEMENT_PRIORITIES = ['NORMAL', 'IMPORTANT', 'URGENT'] as const;
export type EventAnnouncementPriority = (typeof EVENT_ANNOUNCEMENT_PRIORITIES)[number];

export const EVENT_ANNOUNCEMENT_AUDIENCES = ['APPROVED', 'WAITLISTED', 'ALL_REGISTERED', 'CHECKED_IN'] as const;
export type EventAnnouncementAudience = (typeof EVENT_ANNOUNCEMENT_AUDIENCES)[number];

export const COMPETITION_PLATFORMS = [
  'DEVPOST',
  'HACKEREARTH',
  'UNSTOP',
  'HACKATHON_COM',
  'CODECHEF',
  'CODEFORCES',
  'OTHER',
] as const;
export type CompetitionPlatform = (typeof COMPETITION_PLATFORMS)[number];

export const COMPETITION_MODES = ['ONLINE', 'OFFLINE', 'HYBRID'] as const;
export type CompetitionMode = (typeof COMPETITION_MODES)[number];

export const COMPETITION_STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED'] as const;
export type CompetitionStatus = (typeof COMPETITION_STATUSES)[number];

export const WORK_POST_CATEGORIES = [
  'AI_ML',
  'WEB',
  'MOBILE',
  'OPEN_SOURCE',
  'RESEARCH',
  'DESIGN',
  'OTHER',
] as const;
export type WorkPostCategory = (typeof WORK_POST_CATEGORIES)[number];

export const WORK_PROGRESS_STATUSES = [
  'JUST_STARTED',
  'IN_PROGRESS',
  'POLISHING',
  'SHIPPED',
] as const;
export type WorkProgressStatus = (typeof WORK_PROGRESS_STATUSES)[number];

export const CLIENT_ERROR_FEATURES = [
  'APP_STARTUP',
  'AUTH',
  'EVENTS',
  'EVENT_REGISTRATION',
  'EVENT_TICKET',
  'EVENT_BROADCAST',
  'CANVAS',
  'DOUBTS',
  'OD',
  'COMPETITIONS',
  'NOTIFICATIONS',
  'UNKNOWN',
] as const;
export type ClientErrorFeature = (typeof CLIENT_ERROR_FEATURES)[number];

export const CLIENT_ERROR_SEVERITIES = ['WARNING', 'ERROR', 'FATAL'] as const;
export type ClientErrorSeverity = (typeof CLIENT_ERROR_SEVERITIES)[number];

export const NOTIFICATION_TYPES = [
  'OD_SUBMITTED',
  'OD_APPROVED',
  'OD_REJECTED',
  'OD_CHANGES_REQUESTED',
  'OD_PASS_GENERATED',
  'OD_PASS_REVOKED',
  'EVENT_REGISTRATION_CONFIRMED',
  'EVENT_REGISTRATION_CANCELLED',
  'EVENT_REGISTRATION_PENDING',
  'EVENT_REGISTRATION_WAITLISTED',
  'EVENT_WAITLIST_PROMOTED',
  'EVENT_REGISTRATION_APPROVED',
  'EVENT_REGISTRATION_REJECTED',
  'EVENT_ATTENDANCE_CONFIRMED',
  'EVENT_CANCELLED',
  'EVENT_ANNOUNCEMENT',
  'CANVAS_MENTION',
  'CANVAS_REPLY',
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
  EVENTS: 'events',
  EVENT_REGISTRATIONS: 'eventRegistrations',
  EVENT_ANNOUNCEMENTS: 'eventAnnouncements',
  EVENT_ANNOUNCEMENT_RECEIPTS: 'eventAnnouncementReceipts',
  COMPETITIONS: 'competitions',
  USER_SESSIONS: 'userSessions',
  WORK_POSTS: 'workPosts',
  CLIENT_ERROR_REPORTS: 'clientErrorReports',
  SYSTEM: 'system',
  TECH_PULSE: 'techPulse',
  DAILY_SPARKS: 'dailySparks',
  OPENING_SPOTLIGHTS: 'openingSpotlights',
  CODING_QUESTIONS: 'codingQuestions',
  CODING_QUESTION_COMMENTS: 'codingQuestionComments',
  CODING_QUESTION_FLAGS: 'codingQuestionFlags',
  NETWORK_PROFILES: 'networkProfiles',
  CONNECTION_REQUESTS: 'connectionRequests',
  CONNECTIONS: 'connections',
  BLOCKED_USERS: 'blockedUsers',
  PROFILE_REPORTS: 'profileReports',
  NETWORK_CONVERSATIONS: 'networkConversations',
  NETWORK_MESSAGES: 'networkMessages',
  NETWORK_POSTS: 'networkPosts',
  NETWORK_POST_COMMENTS: 'networkPostComments',
  NETWORK_POST_FLAGS: 'networkPostFlags',
  CANVAS_ROOMS: 'canvasRooms',
} as const;

/** Max time another device can stay "logged in" without activity before a new login is allowed. */
export const USER_SESSION_MAX_INACTIVE_MS = 30 * 24 * 60 * 60 * 1000;

export const ACTIVE_USER_SESSION_MESSAGE =
  'This account is already logged in on another device. Please log out from that device first.';

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
  EVENT_CREATED: 'EVENT_CREATED',
  EVENT_APPROVED: 'EVENT_APPROVED',
  EVENT_REJECTED: 'EVENT_REJECTED',
  EVENT_UPDATED: 'EVENT_UPDATED',
  EVENT_CANCELLED: 'EVENT_CANCELLED',
  EVENT_REGISTERED: 'EVENT_REGISTERED',
  EVENT_UNREGISTERED: 'EVENT_UNREGISTERED',
  EVENT_REGISTRATION_APPROVED: 'EVENT_REGISTRATION_APPROVED',
  EVENT_REGISTRATION_REJECTED: 'EVENT_REGISTRATION_REJECTED',
  EVENT_ATTENDANCE_CONFIRMED: 'EVENT_ATTENDANCE_CONFIRMED',
  EVENT_ANNOUNCEMENT_PUBLISHED: 'EVENT_ANNOUNCEMENT_PUBLISHED',
  COMPETITION_CREATED: 'COMPETITION_CREATED',
  COMPETITION_UPDATED: 'COMPETITION_UPDATED',
  COMPETITION_CANCELLED: 'COMPETITION_CANCELLED',
  USER_ACCOUNT_STATUS_CHANGED: 'USER_ACCOUNT_STATUS_CHANGED',
  WORK_POST_MODERATED: 'WORK_POST_MODERATED',
  OFFICIAL_POST_CREATED: 'OFFICIAL_POST_CREATED',
  CANVAS_DROP_MODERATED: 'CANVAS_DROP_MODERATED',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/** CIT Chennai — only @citchennai.net emails may sign in to Citians. */
export const COLLEGE_EMAIL_DOMAIN = 'citchennai.net';

/** Public handle — letters, numbers, underscores (3–24 chars). */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export function normalizeUsername(username: string): string {
  return username.trim();
}

export function usernameKey(username: string): string {
  return normalizeUsername(username).toLowerCase();
}

export function getPublicDisplayName(user: { username?: string; name: string }): string {
  const handle = user.username?.trim();
  return handle || user.name;
}

export function isCollegeEmail(email: string, domain = COLLEGE_EMAIL_DOMAIN): boolean {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1) return false;
  return normalized.slice(atIndex + 1) === domain.toLowerCase();
}

export * from './firebase';
