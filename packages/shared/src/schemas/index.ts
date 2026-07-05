import { z } from 'zod';
import {
  ROLES,
  OD_REQUEST_STATUSES,
  OD_PASS_STATUSES,
  NOTIFICATION_TYPES,
  ALLOWED_FILE_TYPES,
} from '../constants';

export const roleSchema = z.enum(ROLES);

export const userSchema = z.object({
  uid: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().default(''),
  role: roleSchema,
  isActive: z.boolean().default(true),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
});

export const studentSchema = z.object({
  userId: z.string(),
  registerNumber: z.string().min(1),
  departmentId: z.string().min(1),
  year: z.string().min(1),
  section: z.string().min(1),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
});

export const hodSchema = z.object({
  userId: z.string(),
  departmentId: z.string().min(1),
  designation: z.string().min(1),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
});

export const departmentSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  hodId: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
});

export const odRequestStatusSchema = z.enum(OD_REQUEST_STATUSES);

export const odRequestSchema = z.object({
  studentId: z.string(),
  studentUserId: z.string(),
  studentName: z.string().optional(),
  departmentId: z.string(),
  hodUserId: z.string(),
  eventName: z.string().min(1),
  purpose: z.string().min(1),
  organizer: z.string().min(1),
  location: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(1),
  status: odRequestStatusSchema,
  submittedAt: z.unknown().nullable().optional(),
  reviewedAt: z.unknown().nullable().optional(),
  rejectionReason: z.string().optional(),
  changeComment: z.string().optional(),
  hodComment: z.string().optional(),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
});

export const odRequestDraftSchema = odRequestSchema.partial({
  hodUserId: true,
  status: true,
}).extend({
  status: z.literal('DRAFT').optional(),
});

export const odDocumentSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.enum(ALLOWED_FILE_TYPES),
  fileSize: z.number().max(10 * 1024 * 1024),
  storagePath: z.string().min(1),
  uploadedBy: z.string(),
  uploadedAt: z.unknown().optional(),
});

export const odPassStatusSchema = z.enum(OD_PASS_STATUSES);

export const odPassSchema = z.object({
  requestId: z.string(),
  studentUserId: z.string(),
  hodUserId: z.string(),
  departmentId: z.string(),
  approvalId: z.string().min(1),
  qrTokenHash: z.string().min(1),
  digitalSignature: z.string().min(1),
  status: odPassStatusSchema,
  issuedAt: z.unknown().optional(),
  revokedAt: z.unknown().nullable().optional(),
  revokedBy: z.string().nullable().optional(),
  revokeReason: z.string().optional(),
});

export const notificationSchema = z.object({
  userId: z.string(),
  title: z.string().min(1),
  body: z.string().min(1),
  type: z.enum(NOTIFICATION_TYPES),
  entityType: z.string(),
  entityId: z.string(),
  isRead: z.boolean().default(false),
  createdAt: z.unknown().optional(),
});

export const submitODRequestInputSchema = z.object({
  requestId: z.string().optional(),
  eventName: z.string().min(1),
  purpose: z.string().min(1),
  organizer: z.string().min(1),
  location: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(1),
  documentIds: z.array(z.string()).max(5).nullish(),
});

export const approveODRequestInputSchema = z.object({
  requestId: z.string().min(1),
  comment: z.string().optional(),
});

export const rejectODRequestInputSchema = z.object({
  requestId: z.string().min(1),
  rejectionReason: z.string().min(1),
});

export const requestODChangesInputSchema = z.object({
  requestId: z.string().min(1),
  changeComment: z.string().min(1),
});

export const revokeODPassInputSchema = z.object({
  passId: z.string().min(1),
  reason: z.string().min(1),
});

export const provisionUserInputSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(6),
    phone: z.string().optional().default(''),
    role: roleSchema,
    departmentId: z.string().optional(),
    registerNumber: z.string().optional(),
    year: z.string().optional(),
    section: z.string().optional(),
    designation: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'STUDENT') {
      if (!data.departmentId) {
        ctx.addIssue({ code: 'custom', message: 'Department is required for students.', path: ['departmentId'] });
      }
      if (!data.registerNumber) {
        ctx.addIssue({ code: 'custom', message: 'Register number is required.', path: ['registerNumber'] });
      }
      if (!data.year) {
        ctx.addIssue({ code: 'custom', message: 'Year is required.', path: ['year'] });
      }
      if (!data.section) {
        ctx.addIssue({ code: 'custom', message: 'Section is required.', path: ['section'] });
      }
    }
    if (data.role === 'HOD') {
      if (!data.departmentId) {
        ctx.addIssue({ code: 'custom', message: 'Department is required for HOD.', path: ['departmentId'] });
      }
      if (!data.designation) {
        ctx.addIssue({ code: 'custom', message: 'Designation is required.', path: ['designation'] });
      }
    }
  });

export const registerDeviceTokenInputSchema = z.object({
  fcmToken: z.string().min(1),
  platform: z.enum(['android', 'ios', 'web']),
  deviceId: z.string().min(1),
  appVersion: z.string().min(1),
});

export const markNotificationReadInputSchema = z.object({
  notificationId: z.string().min(1),
});

export const verifyODPassQuerySchema = z.object({
  approvalId: z.string().min(1),
  token: z.string().min(1),
});

export const getODPassQrPayloadInputSchema = z.object({
  requestId: z.string().min(1),
});
