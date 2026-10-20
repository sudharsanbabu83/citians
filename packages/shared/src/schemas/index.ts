import { z } from 'zod';
import {
  ROLES,
  OD_REQUEST_STATUSES,
  OD_PASS_STATUSES,
  NOTIFICATION_TYPES,
  ALLOWED_FILE_TYPES,
  EVENT_TYPES,
  EVENT_STATUSES,
  EVENT_APPROVAL_MODES,
  EVENT_REGISTRATION_STATUSES,
  EVENT_ANNOUNCEMENT_PRIORITIES,
  EVENT_ANNOUNCEMENT_AUDIENCES,
  COMPETITION_PLATFORMS,
  COMPETITION_MODES,
  COMPETITION_STATUSES,
  WORK_POST_CATEGORIES,
  WORK_PROGRESS_STATUSES,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
  CLIENT_ERROR_FEATURES,
  CLIENT_ERROR_SEVERITIES,
} from '../constants';

export const usernameSchema = z
  .string()
  .min(USERNAME_MIN_LENGTH, `Username must be at least ${USERNAME_MIN_LENGTH} characters`)
  .max(USERNAME_MAX_LENGTH, `Username must be at most ${USERNAME_MAX_LENGTH} characters`)
  .regex(USERNAME_PATTERN, 'Use letters, numbers, and underscores only.');

export const roleSchema = z.enum(ROLES);

export const userSchema = z.object({
  uid: z.string(),
  name: z.string().min(1),
  username: z
    .string()
    .min(USERNAME_MIN_LENGTH)
    .max(USERNAME_MAX_LENGTH)
    .regex(USERNAME_PATTERN)
    .optional(),
  usernameLower: z.string().optional(),
  citianId: z.string().regex(/^citian@[0-9]+$/).optional(),
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
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
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

export const submitODRequestBaseSchema = z.object({
  requestId: z.string().optional(),
  eventName: z.string().min(1),
  purpose: z.string().min(1),
  organizer: z.string().min(1),
  location: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  reason: z.string().min(1),
  documentIds: z.array(z.string()).max(5).nullish(),
});

export const odRequestFormSchema = submitODRequestBaseSchema.omit({
  requestId: true,
  documentIds: true,
});

export const submitODRequestInputSchema = submitODRequestBaseSchema
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  })
  .refine(
    (data) => data.endDate !== data.startDate || data.endTime >= data.startTime,
    {
      message: 'End time must be on or after start time',
      path: ['endTime'],
    }
  );

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
    password: z.string().min(6).optional(),
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

export const registerStudentInputSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    username: usernameSchema,
    phone: z.string().trim().regex(/^\+?[0-9][0-9\s-]{7,17}$/, 'Enter a valid phone number.'),
    registerNumber: z.string().min(1).max(40),
    departmentId: z.string().min(1),
    year: z.string().min(1).max(20),
    section: z.string().min(1).max(20),
  });

export const setupUsernameInputSchema = z.object({
  username: usernameSchema,
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

export const eventTypeSchema = z.enum(EVENT_TYPES);
export const eventStatusSchema = z.enum(EVENT_STATUSES);
export const eventApprovalModeSchema = z.enum(EVENT_APPROVAL_MODES);
export const eventRegistrationStatusSchema = z.enum(EVENT_REGISTRATION_STATUSES);
export const eventAnnouncementPrioritySchema = z.enum(EVENT_ANNOUNCEMENT_PRIORITIES);
export const eventAnnouncementAudienceSchema = z.enum(EVENT_ANNOUNCEMENT_AUDIENCES);

export const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  posterUrl: z.string().url().optional(),
  type: eventTypeSchema,
  organizerUserId: z.string(),
  organizerName: z.string(),
  departmentId: z.string().nullable(),
  venue: z.string().min(1),
  startAt: z.unknown(),
  endAt: z.unknown(),
  registrationDeadline: z.unknown(),
  maxParticipants: z.number().int().positive().nullable(),
  registrationCount: z.number().int().nonnegative().default(0),
  waitlistCount: z.number().int().nonnegative().default(0),
  approvedCount: z.number().int().nonnegative().default(0),
  approvalMode: eventApprovalModeSchema.default('MANUAL'),
  status: eventStatusSchema,
  approvalReason: z.string().nullable().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.unknown().optional(),
  rejectedBy: z.string().optional(),
  rejectedAt: z.unknown().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
});

export const eventRegistrationSchema = z.object({
  eventId: z.string(),
  userId: z.string(),
  studentName: z.string(),
  registerNumber: z.string(),
  phoneNumber: z.string().optional().default(''),
  departmentId: z.string(),
  eventTitle: z.string().optional(),
  eventType: eventTypeSchema.optional(),
  eventVenue: z.string().optional(),
  eventStartAt: z.unknown().optional(),
  status: eventRegistrationStatusSchema,
  approvalReason: z.string().nullable().optional(),
  approvedAt: z.unknown().nullable().optional(),
  rejectedAt: z.unknown().nullable().optional(),
  ticketToken: z.string().nullable().optional(),
  ticketIssuedAt: z.unknown().nullable().optional(),
  attendedAt: z.unknown().nullable().optional(),
  checkedInByUserId: z.string().nullable().optional(),
  registeredAt: z.unknown().optional(),
  waitlistedAt: z.unknown().nullable().optional(),
  promotedAt: z.unknown().nullable().optional(),
  cancelledAt: z.unknown().nullable().optional(),
});

export const createEventInputSchema = z
  .object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(5000),
    posterUrl: z.string().url().optional(),
    type: eventTypeSchema,
    departmentId: z.string().nullable().optional(),
    venue: z.string().min(1).max(300),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    registrationDeadline: z.string().datetime(),
      maxParticipants: z.number().int().positive().nullable().optional(),
      approvalMode: eventApprovalModeSchema.default('MANUAL'),
    tags: z.array(z.string().min(1).max(40)).max(10).optional(),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startAt);
    const end = new Date(data.endAt);
    const deadline = new Date(data.registrationDeadline);
    if (end <= start) {
      ctx.addIssue({ code: 'custom', message: 'End time must be after start time.', path: ['endAt'] });
    }
    if (deadline >= start) {
      ctx.addIssue({
        code: 'custom',
        message: 'Registration deadline must be before the event starts.',
        path: ['registrationDeadline'],
      });
    }
  });

export const updateEventInputSchema = z
  .object({
    eventId: z.string().min(1),
    title: z.string().min(3).max(200).optional(),
    description: z.string().min(10).max(5000).optional(),
    posterUrl: z.string().url().optional(),
    type: eventTypeSchema.optional(),
    venue: z.string().min(1).max(300).optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    registrationDeadline: z.string().datetime().optional(),
      maxParticipants: z.number().int().positive().nullable().optional(),
      approvalMode: eventApprovalModeSchema.optional(),
    tags: z.array(z.string().min(1).max(40)).max(10).optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.posterUrl !== undefined ||
      data.type !== undefined ||
      data.venue !== undefined ||
      data.startAt !== undefined ||
      data.endAt !== undefined ||
      data.registrationDeadline !== undefined ||
        data.maxParticipants !== undefined ||
        data.approvalMode !== undefined ||
        data.tags !== undefined,
    { message: 'At least one field must be provided to update.' }
  );

export const cancelEventInputSchema = z.object({
  eventId: z.string().min(1),
  reason: z.string().min(3).max(500).optional(),
});

export const registerForEventInputSchema = z.object({
  eventId: z.string().min(1),
  attendeeName: z.string().trim().min(2, 'Enter your full name.').max(120),
  registerNumber: z.string().trim().min(2, 'Enter your register number.').max(40),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9\s-]{7,17}$/, 'Enter a valid mobile number.'),
});

export const eventAnnouncementSchema = z.object({
  eventId: z.string(),
  eventTitle: z.string(),
  organizerUserId: z.string(),
  organizerName: z.string(),
  message: z.string().min(1).max(1200),
  priority: eventAnnouncementPrioritySchema,
  audience: eventAnnouncementAudienceSchema,
  isPinned: z.boolean().default(false),
  recipientCount: z.number().int().nonnegative().default(0),
  acknowledgedCount: z.number().int().nonnegative().default(0),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
});

export const eventAnnouncementReceiptSchema = z.object({
  announcementId: z.string(),
  eventId: z.string(),
  userId: z.string(),
  isActive: z.boolean().default(true),
  readAt: z.unknown().nullable().optional(),
  acknowledgedAt: z.unknown().nullable().optional(),
  createdAt: z.unknown().optional(),
});

export const unregisterFromEventInputSchema = z.object({
  eventId: z.string().min(1),
});

export const approveEventRegistrationInputSchema = z.object({
  registrationId: z.string().min(1),
});

export const rejectEventRegistrationInputSchema = z.object({
  registrationId: z.string().min(1),
  reason: z.string().min(3).max(500).optional(),
});

export const removeEventAttendeeInputSchema = z.object({
  registrationId: z.string().min(1),
  reason: z.string().trim().min(3).max(500).optional(),
});

export const approveAllEventRegistrationsInputSchema = z.object({
  eventId: z.string().min(1),
});

export const getEventTicketInputSchema = z.object({
  eventId: z.string().min(1),
});

export const checkInEventAttendeeInputSchema = z.object({
  registrationId: z.string().min(1),
  ticketToken: z.string().min(20).max(200),
});

export const publishEventAnnouncementInputSchema = z.object({
  // Optional only for backward compatibility with APKs released before
  // idempotent broadcasting; current clients always provide this value.
  requestId: z.string().trim().min(16).max(100).regex(/^[A-Za-z0-9_-]+$/).optional(),
  eventId: z.string().min(1),
  message: z.string().trim().min(3, 'Write at least 3 characters.').max(1200),
  priority: eventAnnouncementPrioritySchema.default('NORMAL'),
  audience: eventAnnouncementAudienceSchema.default('APPROVED'),
  isPinned: z.boolean().default(false),
});

export const acknowledgeEventAnnouncementInputSchema = z.object({
  announcementId: z.string().min(1),
});

export const competitionPlatformSchema = z.enum(COMPETITION_PLATFORMS);
export const competitionModeSchema = z.enum(COMPETITION_MODES);
export const competitionStatusSchema = z.enum(COMPETITION_STATUSES);

export const competitionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  platform: competitionPlatformSchema,
  platformLabel: z.string().optional(),
  registrationUrl: z.string().url(),
  mode: competitionModeSchema,
  venue: z.string().optional(),
  startAt: z.unknown(),
  endAt: z.unknown(),
  registrationDeadline: z.unknown(),
  prizePool: z.string().optional(),
  teamSize: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: competitionStatusSchema,
  createdByUserId: z.string(),
  createdByName: z.string(),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
});

const competitionDateFields = {
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  registrationDeadline: z.string().datetime(),
};

function refineCompetitionDates(
  data: { startAt: string; endAt: string; registrationDeadline: string },
  ctx: z.RefinementCtx
) {
  const start = new Date(data.startAt);
  const end = new Date(data.endAt);
  const deadline = new Date(data.registrationDeadline);
  if (end <= start) {
    ctx.addIssue({ code: 'custom', message: 'End time must be after start time.', path: ['endAt'] });
  }
  if (deadline >= start) {
    ctx.addIssue({
      code: 'custom',
      message: 'Registration deadline must be before the competition starts.',
      path: ['registrationDeadline'],
    });
  }
}

export const createCompetitionInputSchema = z
  .object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(5000),
    platform: competitionPlatformSchema,
    platformLabel: z.string().min(1).max(80).optional(),
    registrationUrl: z.string().url(),
    mode: competitionModeSchema,
    venue: z.string().max(300).optional(),
    prizePool: z.string().max(200).optional(),
    teamSize: z.string().max(80).optional(),
    tags: z.array(z.string().min(1).max(40)).max(10).optional(),
    publish: z.boolean().optional(),
    ...competitionDateFields,
  })
  .superRefine((data, ctx) => {
    refineCompetitionDates(data, ctx);
    if (data.platform === 'OTHER' && !data.platformLabel?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Platform name is required when platform is Other.',
        path: ['platformLabel'],
      });
    }
    if (data.mode !== 'ONLINE' && !data.venue?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Venue is required for offline or hybrid competitions.',
        path: ['venue'],
      });
    }
  });

export const updateCompetitionInputSchema = z
  .object({
    competitionId: z.string().min(1),
    title: z.string().min(3).max(200).optional(),
    description: z.string().min(10).max(5000).optional(),
    platform: competitionPlatformSchema.optional(),
    platformLabel: z.string().min(1).max(80).optional(),
    registrationUrl: z.string().url().optional(),
    mode: competitionModeSchema.optional(),
    venue: z.string().max(300).optional(),
    prizePool: z.string().max(200).optional(),
    teamSize: z.string().max(80).optional(),
    tags: z.array(z.string().min(1).max(40)).max(10).optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    registrationDeadline: z.string().datetime().optional(),
    publish: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.platform !== undefined ||
      data.platformLabel !== undefined ||
      data.registrationUrl !== undefined ||
      data.mode !== undefined ||
      data.venue !== undefined ||
      data.prizePool !== undefined ||
      data.teamSize !== undefined ||
      data.tags !== undefined ||
      data.startAt !== undefined ||
      data.endAt !== undefined ||
      data.registrationDeadline !== undefined ||
      data.publish !== undefined,
    { message: 'At least one field must be provided to update.' }
  );

export const cancelCompetitionInputSchema = z.object({
  competitionId: z.string().min(1),
  reason: z.string().min(3).max(500).optional(),
});

export const userSessionSchema = z.object({
  userId: z.string(),
  sessionId: z.string().min(8),
  deviceLabel: z.string().max(120).nullable().optional(),
  platform: z.string().max(40).optional(),
  appVersion: z.string().max(40).optional(),
  buildVersion: z.string().max(40).optional(),
  osVersion: z.string().max(40).optional(),
  currentRoute: z.string().max(200).optional(),
  currentFeature: z.string().max(80).optional(),
  lastSeenAt: z.unknown(),
  createdAt: z.unknown().optional(),
});

export const claimUserSessionInputSchema = z.object({
  sessionId: z.string().min(8).max(128),
  deviceLabel: z.string().max(120).optional(),
  platform: z.string().max(40).optional(),
  appVersion: z.string().max(40).optional(),
  buildVersion: z.string().max(40).optional(),
  osVersion: z.string().max(40).optional(),
});

export const refreshUserSessionInputSchema = z.object({
  sessionId: z.string().min(8).max(128),
  currentRoute: z.string().max(200).optional(),
  currentFeature: z.string().max(80).optional(),
});

export const workPostCategorySchema = z.enum(WORK_POST_CATEGORIES);
export const workProgressStatusSchema = z.enum(WORK_PROGRESS_STATUSES);

export const codingQuestionDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const codingQuestionSchema = z.object({
  authorId: z.string().min(1),
  authorName: z.string().min(1).max(120),
  title: z.string().min(3).max(140),
  problemStatement: z.string().min(20).max(2500),
  solution: z.string().min(20).max(8000),
  language: z.string().min(1).max(40),
  difficulty: codingQuestionDifficultySchema,
  tags: z.array(z.string().min(1).max(24)).max(5).default([]),
  likedByUserIds: z.array(z.string()).default([]),
  commentCount: z.number().int().min(0).default(0),
  flagCount: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
});

export const createCodingQuestionInputSchema = codingQuestionSchema.omit({
  likedByUserIds: true,
  commentCount: true,
  flagCount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export const codingQuestionCommentSchema = z.object({
  questionId: z.string().min(1),
  authorId: z.string().min(1),
  authorName: z.string().min(1).max(120),
  body: z.string().min(2).max(1000),
  createdAt: z.unknown().optional(),
});

export const codingQuestionFlagSchema = z.object({
  questionId: z.string().min(1),
  reporterId: z.string().min(1),
  reason: z.string().min(3).max(300),
  createdAt: z.unknown().optional(),
});

export const networkProfileSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1).max(120),
  username: z.string().min(1).max(40),
  citianId: z.string().optional(),
  departmentId: z.string().min(1),
  departmentName: z.string().min(1).max(120),
  year: z.string().min(1).max(20),
  section: z.string().min(1).max(20),
  bio: z.string().max(240).default(''),
  skills: z.array(z.string().min(1).max(32)).max(10).default([]),
  interests: z.array(z.string().min(1).max(32)).max(10).default([]),
  githubUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  visibility: z.enum(['COLLEGE_ONLY', 'PRIVATE']).default('COLLEGE_ONLY'),
  updatedAt: z.unknown().optional(),
});

export const connectionRequestSchema = z.object({
  requesterId: z.string().min(1),
  recipientId: z.string().min(1),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
});

export const connectionSchema = z.object({
  userIds: z.array(z.string().min(1)).length(2),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
});

export const blockedUserSchema = z.object({
  blockerId: z.string().min(1),
  blockedId: z.string().min(1),
  createdAt: z.unknown().optional(),
});

export const profileReportSchema = z.object({
  reporterId: z.string().min(1),
  targetUserId: z.string().min(1),
  reason: z.string().min(3).max(300),
  status: z.enum(['OPEN', 'RESOLVED']).default('OPEN'),
  createdAt: z.unknown().optional(),
});

export const networkConversationSchema = z.object({
  memberIds: z.array(z.string().min(1)).length(2),
  lastMessage: z.string().max(1000).default(''),
  lastMessageAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
});

export const networkMessageSchema = z.object({
  conversationId: z.string().min(1),
  senderId: z.string().min(1),
  body: z.string().min(1).max(1000),
  createdAt: z.unknown().optional(),
});

export const networkPostSchema = z.object({
  authorId: z.string().min(1),
  authorName: z.string().min(1).max(120),
  type: z.enum(['PROJECT', 'ACHIEVEMENT', 'INTERNSHIP', 'RESOURCE', 'UPDATE']),
  title: z.string().min(3).max(120),
  body: z.string().min(10).max(1500),
  tags: z.array(z.string().min(1).max(32)).max(5).default([]),
  likedByUserIds: z.array(z.string()).default([]),
  commentCount: z.number().int().min(0).default(0),
  flagCount: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
});

export const workPostSchema = z.object({
  studentUserId: z.string().min(1),
  studentName: z.string().min(1).max(120),
  registerNumber: z.string().min(1).max(40),
  departmentId: z.string().min(1),
  departmentName: z.string().min(1).max(120),
  year: z.string().min(1).max(20),
  section: z.string().min(1).max(20),
  title: z.string().min(3).max(80),
  description: z.string().min(10).max(500),
  category: workPostCategorySchema,
  progressStatus: workProgressStatusSchema,
  tags: z.array(z.string().min(1).max(24)).max(3).default([]),
  lookingForHelp: z.boolean().default(false),
  experimentId: z.string().min(1).max(40).optional(),
  likedByUserIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
});

export const createWorkPostInputSchema = workPostSchema
  .omit({
    likedByUserIds: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    studentUserId: z.string().min(1),
  });

export const updateWorkPostInputSchema = z.object({
  postId: z.string().min(1),
  title: z.string().min(3).max(80).optional(),
  description: z.string().min(10).max(500).optional(),
  category: workPostCategorySchema.optional(),
  progressStatus: workProgressStatusSchema.optional(),
  tags: z.array(z.string().min(1).max(24)).max(3).optional(),
  lookingForHelp: z.boolean().optional(),
});

export const releaseUserSessionInputSchema = z.object({
  sessionId: z.string().min(8).max(128),
});

export const reportClientErrorInputSchema = z.object({
  message: z.string().min(1).max(1000),
  code: z.string().max(120).optional(),
  feature: z.enum(CLIENT_ERROR_FEATURES),
  operation: z.string().min(1).max(120),
  severity: z.enum(CLIENT_ERROR_SEVERITIES).default('ERROR'),
  platform: z.string().min(1).max(30),
  appVersion: z.string().max(40).optional(),
  buildVersion: z.string().max(40).optional(),
  deviceModel: z.string().max(100).optional(),
  osVersion: z.string().max(80).optional(),
  route: z.string().max(200).optional(),
  context: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
