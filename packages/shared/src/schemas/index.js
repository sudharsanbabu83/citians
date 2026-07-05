"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyODPassQuerySchema = exports.markNotificationReadInputSchema = exports.registerDeviceTokenInputSchema = exports.revokeODPassInputSchema = exports.requestODChangesInputSchema = exports.rejectODRequestInputSchema = exports.approveODRequestInputSchema = exports.submitODRequestInputSchema = exports.notificationSchema = exports.odPassSchema = exports.odPassStatusSchema = exports.odDocumentSchema = exports.odRequestDraftSchema = exports.odRequestSchema = exports.odRequestStatusSchema = exports.departmentSchema = exports.hodSchema = exports.studentSchema = exports.userSchema = exports.roleSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
exports.roleSchema = zod_1.z.enum(constants_1.ROLES);
exports.userSchema = zod_1.z.object({
    uid: zod_1.z.string(),
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().optional().default(''),
    role: exports.roleSchema,
    isActive: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.unknown().optional(),
    updatedAt: zod_1.z.unknown().optional(),
});
exports.studentSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    registerNumber: zod_1.z.string().min(1),
    departmentId: zod_1.z.string().min(1),
    year: zod_1.z.string().min(1),
    section: zod_1.z.string().min(1),
    createdAt: zod_1.z.unknown().optional(),
    updatedAt: zod_1.z.unknown().optional(),
});
exports.hodSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    departmentId: zod_1.z.string().min(1),
    designation: zod_1.z.string().min(1),
    createdAt: zod_1.z.unknown().optional(),
    updatedAt: zod_1.z.unknown().optional(),
});
exports.departmentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    code: zod_1.z.string().min(1),
    hodId: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.unknown().optional(),
    updatedAt: zod_1.z.unknown().optional(),
});
exports.odRequestStatusSchema = zod_1.z.enum(constants_1.OD_REQUEST_STATUSES);
exports.odRequestSchema = zod_1.z.object({
    studentId: zod_1.z.string(),
    studentUserId: zod_1.z.string(),
    departmentId: zod_1.z.string(),
    hodUserId: zod_1.z.string(),
    eventName: zod_1.z.string().min(1),
    purpose: zod_1.z.string().min(1),
    organizer: zod_1.z.string().min(1),
    location: zod_1.z.string().min(1),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: zod_1.z.string().min(1),
    status: exports.odRequestStatusSchema,
    submittedAt: zod_1.z.unknown().nullable().optional(),
    reviewedAt: zod_1.z.unknown().nullable().optional(),
    rejectionReason: zod_1.z.string().optional(),
    changeComment: zod_1.z.string().optional(),
    hodComment: zod_1.z.string().optional(),
    createdAt: zod_1.z.unknown().optional(),
    updatedAt: zod_1.z.unknown().optional(),
});
exports.odRequestDraftSchema = exports.odRequestSchema.partial({
    hodUserId: true,
    status: true,
}).extend({
    status: zod_1.z.literal('DRAFT').optional(),
});
exports.odDocumentSchema = zod_1.z.object({
    fileName: zod_1.z.string().min(1),
    fileType: zod_1.z.enum(constants_1.ALLOWED_FILE_TYPES),
    fileSize: zod_1.z.number().max(10 * 1024 * 1024),
    storagePath: zod_1.z.string().min(1),
    uploadedBy: zod_1.z.string(),
    uploadedAt: zod_1.z.unknown().optional(),
});
exports.odPassStatusSchema = zod_1.z.enum(constants_1.OD_PASS_STATUSES);
exports.odPassSchema = zod_1.z.object({
    requestId: zod_1.z.string(),
    studentUserId: zod_1.z.string(),
    hodUserId: zod_1.z.string(),
    departmentId: zod_1.z.string(),
    approvalId: zod_1.z.string().min(1),
    qrTokenHash: zod_1.z.string().min(1),
    digitalSignature: zod_1.z.string().min(1),
    status: exports.odPassStatusSchema,
    issuedAt: zod_1.z.unknown().optional(),
    revokedAt: zod_1.z.unknown().nullable().optional(),
    revokedBy: zod_1.z.string().nullable().optional(),
    revokeReason: zod_1.z.string().optional(),
});
exports.notificationSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    title: zod_1.z.string().min(1),
    body: zod_1.z.string().min(1),
    type: zod_1.z.enum(constants_1.NOTIFICATION_TYPES),
    entityType: zod_1.z.string(),
    entityId: zod_1.z.string(),
    isRead: zod_1.z.boolean().default(false),
    createdAt: zod_1.z.unknown().optional(),
});
exports.submitODRequestInputSchema = zod_1.z.object({
    requestId: zod_1.z.string().optional(),
    eventName: zod_1.z.string().min(1),
    purpose: zod_1.z.string().min(1),
    organizer: zod_1.z.string().min(1),
    location: zod_1.z.string().min(1),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: zod_1.z.string().min(1),
    documentIds: zod_1.z.array(zod_1.z.string()).max(5).optional(),
});
exports.approveODRequestInputSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(1),
    comment: zod_1.z.string().optional(),
});
exports.rejectODRequestInputSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(1),
    rejectionReason: zod_1.z.string().min(1),
});
exports.requestODChangesInputSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(1),
    changeComment: zod_1.z.string().min(1),
});
exports.revokeODPassInputSchema = zod_1.z.object({
    passId: zod_1.z.string().min(1),
    reason: zod_1.z.string().min(1),
});
exports.registerDeviceTokenInputSchema = zod_1.z.object({
    fcmToken: zod_1.z.string().min(1),
    platform: zod_1.z.enum(['android', 'ios', 'web']),
    deviceId: zod_1.z.string().min(1),
    appVersion: zod_1.z.string().min(1),
});
exports.markNotificationReadInputSchema = zod_1.z.object({
    notificationId: zod_1.z.string().min(1),
});
exports.verifyODPassQuerySchema = zod_1.z.object({
    approvalId: zod_1.z.string().min(1),
    token: zod_1.z.string().min(1),
});
//# sourceMappingURL=index.js.map