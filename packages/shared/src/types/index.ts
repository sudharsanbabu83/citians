import type { z } from 'zod';
import type {
  userSchema,
  studentSchema,
  hodSchema,
  departmentSchema,
  odRequestSchema,
  odDocumentSchema,
  odPassSchema,
  notificationSchema,
  eventSchema,
  eventRegistrationSchema,
  eventAnnouncementSchema,
  eventAnnouncementReceiptSchema,
  competitionSchema,
  workPostSchema,
  codingQuestionSchema,
  codingQuestionCommentSchema,
  codingQuestionFlagSchema,
  networkProfileSchema,
  connectionRequestSchema,
  connectionSchema,
  blockedUserSchema,
  profileReportSchema,
  networkConversationSchema,
  networkMessageSchema,
  networkPostSchema,
  reportClientErrorInputSchema,
} from '../schemas';

export type User = z.infer<typeof userSchema>;
export type Student = z.infer<typeof studentSchema>;
export type Hod = z.infer<typeof hodSchema>;
export type Department = z.infer<typeof departmentSchema>;
export type ODRequest = z.infer<typeof odRequestSchema>;
export type ODDocument = z.infer<typeof odDocumentSchema>;
export type ODPass = z.infer<typeof odPassSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type Event = z.infer<typeof eventSchema>;
export type EventRegistration = z.infer<typeof eventRegistrationSchema>;
export type EventAnnouncement = z.infer<typeof eventAnnouncementSchema>;
export type EventAnnouncementReceipt = z.infer<typeof eventAnnouncementReceiptSchema>;
export type Competition = z.infer<typeof competitionSchema>;
export type WorkPost = z.infer<typeof workPostSchema>;
export type CodingQuestion = z.infer<typeof codingQuestionSchema>;
export type CodingQuestionComment = z.infer<typeof codingQuestionCommentSchema>;
export type CodingQuestionFlag = z.infer<typeof codingQuestionFlagSchema>;
export type NetworkProfile = z.infer<typeof networkProfileSchema>;
export type ConnectionRequest = z.infer<typeof connectionRequestSchema>;
export type Connection = z.infer<typeof connectionSchema>;
export type BlockedUser = z.infer<typeof blockedUserSchema>;
export type ProfileReport = z.infer<typeof profileReportSchema>;
export type NetworkConversation = z.infer<typeof networkConversationSchema>;
export type NetworkMessage = z.infer<typeof networkMessageSchema>;
export type NetworkPost = z.infer<typeof networkPostSchema>;
export type ReportClientErrorInput = z.infer<typeof reportClientErrorInputSchema>;

export interface EventWithId extends Event {
  id: string;
}

export interface EventRegistrationWithId extends EventRegistration {
  id: string;
}

export interface CreateEventResult {
  eventId: string;
  status: string;
}

export interface RegisterForEventResult {
  registrationId: string;
  eventId: string;
  status: 'APPROVED' | 'PENDING' | 'WAITLISTED';
}

export interface ApproveEventRegistrationsBatchResult {
  eventId: string;
  approvedCount: number;
  hasMore: boolean;
}

export interface EventAnnouncementWithId extends EventAnnouncement { id: string; }

export interface EventTicketPayload {
  registrationId: string;
  eventId: string;
  eventTitle: string;
  qrValue: string;
}

export interface EventCheckInResult {
  status: 'VALID' | 'ALREADY_CHECKED_IN' | 'INVALID';
  registrationId?: string;
  studentName?: string;
  registerNumber?: string;
  eventTitle?: string;
  checkedInAt?: string;
}

export interface CompetitionWithId extends Competition {
  id: string;
}

export interface WorkPostWithId extends WorkPost {
  id: string;
}

export interface CodingQuestionWithId extends CodingQuestion {
  id: string;
}

export interface CodingQuestionCommentWithId extends CodingQuestionComment {
  id: string;
}

export interface NetworkProfileWithId extends NetworkProfile { id: string; }
export interface ConnectionRequestWithId extends ConnectionRequest { id: string; }
export interface ConnectionWithId extends Connection { id: string; }
export interface NetworkConversationWithId extends NetworkConversation { id: string; }
export interface NetworkMessageWithId extends NetworkMessage { id: string; }
export interface NetworkPostWithId extends NetworkPost { id: string; }

export interface CreateCompetitionResult {
  competitionId: string;
  status: string;
}

export interface HealthCheckResponse {
  status: 'ok';
  timestamp: string;
  version: string;
  environment: string;
}

export interface SystemHealthCheck {
  id: 'functions' | 'firestore' | 'auth' | 'storage';
  label: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  latencyMs: number;
  message: string;
}

export interface ClientErrorReportSummary {
  id: string;
  message: string;
  code?: string;
  feature: string;
  operation: string;
  severity: 'WARNING' | 'ERROR' | 'FATAL';
  platform: string;
  appVersion?: string;
  buildVersion?: string;
  deviceModel?: string;
  osVersion?: string;
  route?: string;
  userId: string;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface SystemHealthResponse {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  timestamp: string;
  environment: string;
  checks: SystemHealthCheck[];
  incidents: {
    last24Hours: number;
    affectedUsers: number;
    fatalCount: number;
    byFeature: Record<string, number>;
  };
  recentErrors: ClientErrorReportSummary[];
}

export interface ActiveUserReportEntry {
  userId: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  currentRoute?: string;
  currentFeature?: string;
  deviceLabel?: string;
  lastSeenAt: string;
  sessionStartedAt?: string;
  appVersion?: string;
  platform?: string;
  isActive: boolean;
}

export interface ActiveUserReportResponse {
  generatedAt: string;
  activeWindowSeconds: number;
  summary: {
    activeUsers: number;
    students: number;
    staff: number;
    byFeature: Record<string, number>;
  };
  users: ActiveUserReportEntry[];
}

export interface VerifyODPassResponse {
  verificationStatus: 'VALID' | 'INVALID' | 'REVOKED' | 'EXPIRED' | 'TAMPERED';
  approvalId?: string;
  studentName?: string;
  registerNumber?: string;
  department?: string;
  eventName?: string;
  startDate?: string;
  endDate?: string;
  approvedBy?: string;
  issuedAt?: string;
  verifiedAt?: string;
}

export interface ODPassQrPayload {
  passId: string;
  approvalId: string;
  qrValue: string;
  eventName: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
}
