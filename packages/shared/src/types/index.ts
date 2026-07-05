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
} from '../schemas';

export type User = z.infer<typeof userSchema>;
export type Student = z.infer<typeof studentSchema>;
export type Hod = z.infer<typeof hodSchema>;
export type Department = z.infer<typeof departmentSchema>;
export type ODRequest = z.infer<typeof odRequestSchema>;
export type ODDocument = z.infer<typeof odDocumentSchema>;
export type ODPass = z.infer<typeof odPassSchema>;
export type Notification = z.infer<typeof notificationSchema>;

export interface HealthCheckResponse {
  status: 'ok';
  timestamp: string;
  version: string;
  environment: string;
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
