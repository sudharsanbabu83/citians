import { z } from 'zod';
export declare const roleSchema: z.ZodEnum<["STUDENT", "HOD", "ADMIN"]>;
export declare const userSchema: z.ZodObject<{
    uid: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    role: z.ZodEnum<["STUDENT", "HOD", "ADMIN"]>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodUnknown>;
    updatedAt: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    uid: string;
    name: string;
    email: string;
    phone: string;
    role: "STUDENT" | "HOD" | "ADMIN";
    isActive: boolean;
    createdAt?: unknown;
    updatedAt?: unknown;
}, {
    uid: string;
    name: string;
    email: string;
    role: "STUDENT" | "HOD" | "ADMIN";
    phone?: string | undefined;
    isActive?: boolean | undefined;
    createdAt?: unknown;
    updatedAt?: unknown;
}>;
export declare const studentSchema: z.ZodObject<{
    userId: z.ZodString;
    registerNumber: z.ZodString;
    departmentId: z.ZodString;
    year: z.ZodString;
    section: z.ZodString;
    createdAt: z.ZodOptional<z.ZodUnknown>;
    updatedAt: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    registerNumber: string;
    departmentId: string;
    year: string;
    section: string;
    createdAt?: unknown;
    updatedAt?: unknown;
}, {
    userId: string;
    registerNumber: string;
    departmentId: string;
    year: string;
    section: string;
    createdAt?: unknown;
    updatedAt?: unknown;
}>;
export declare const hodSchema: z.ZodObject<{
    userId: z.ZodString;
    departmentId: z.ZodString;
    designation: z.ZodString;
    createdAt: z.ZodOptional<z.ZodUnknown>;
    updatedAt: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    departmentId: string;
    designation: string;
    createdAt?: unknown;
    updatedAt?: unknown;
}, {
    userId: string;
    departmentId: string;
    designation: string;
    createdAt?: unknown;
    updatedAt?: unknown;
}>;
export declare const departmentSchema: z.ZodObject<{
    name: z.ZodString;
    code: z.ZodString;
    hodId: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodUnknown>;
    updatedAt: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    code: string;
    createdAt?: unknown;
    updatedAt?: unknown;
    hodId?: string | undefined;
}, {
    name: string;
    code: string;
    isActive?: boolean | undefined;
    createdAt?: unknown;
    updatedAt?: unknown;
    hodId?: string | undefined;
}>;
export declare const odRequestStatusSchema: z.ZodEnum<["DRAFT", "PENDING_HOD_REVIEW", "APPROVED", "REJECTED", "CHANGES_REQUESTED", "REVOKED"]>;
export declare const odRequestSchema: z.ZodObject<{
    studentId: z.ZodString;
    studentUserId: z.ZodString;
    departmentId: z.ZodString;
    hodUserId: z.ZodString;
    eventName: z.ZodString;
    purpose: z.ZodString;
    organizer: z.ZodString;
    location: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    reason: z.ZodString;
    status: z.ZodEnum<["DRAFT", "PENDING_HOD_REVIEW", "APPROVED", "REJECTED", "CHANGES_REQUESTED", "REVOKED"]>;
    submittedAt: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
    reviewedAt: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
    rejectionReason: z.ZodOptional<z.ZodString>;
    changeComment: z.ZodOptional<z.ZodString>;
    hodComment: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodUnknown>;
    updatedAt: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    status: "DRAFT" | "PENDING_HOD_REVIEW" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "REVOKED";
    departmentId: string;
    studentId: string;
    studentUserId: string;
    hodUserId: string;
    eventName: string;
    purpose: string;
    organizer: string;
    location: string;
    startDate: string;
    endDate: string;
    reason: string;
    createdAt?: unknown;
    updatedAt?: unknown;
    submittedAt?: unknown;
    reviewedAt?: unknown;
    rejectionReason?: string | undefined;
    changeComment?: string | undefined;
    hodComment?: string | undefined;
}, {
    status: "DRAFT" | "PENDING_HOD_REVIEW" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "REVOKED";
    departmentId: string;
    studentId: string;
    studentUserId: string;
    hodUserId: string;
    eventName: string;
    purpose: string;
    organizer: string;
    location: string;
    startDate: string;
    endDate: string;
    reason: string;
    createdAt?: unknown;
    updatedAt?: unknown;
    submittedAt?: unknown;
    reviewedAt?: unknown;
    rejectionReason?: string | undefined;
    changeComment?: string | undefined;
    hodComment?: string | undefined;
}>;
export declare const odRequestDraftSchema: z.ZodObject<{
    createdAt: z.ZodOptional<z.ZodUnknown>;
    updatedAt: z.ZodOptional<z.ZodUnknown>;
    departmentId: z.ZodString;
    studentId: z.ZodString;
    studentUserId: z.ZodString;
    hodUserId: z.ZodOptional<z.ZodString>;
    eventName: z.ZodString;
    purpose: z.ZodString;
    organizer: z.ZodString;
    location: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    reason: z.ZodString;
    submittedAt: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
    reviewedAt: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
    rejectionReason: z.ZodOptional<z.ZodString>;
    changeComment: z.ZodOptional<z.ZodString>;
    hodComment: z.ZodOptional<z.ZodString>;
} & {
    status: z.ZodOptional<z.ZodLiteral<"DRAFT">>;
}, "strip", z.ZodTypeAny, {
    departmentId: string;
    studentId: string;
    studentUserId: string;
    eventName: string;
    purpose: string;
    organizer: string;
    location: string;
    startDate: string;
    endDate: string;
    reason: string;
    createdAt?: unknown;
    updatedAt?: unknown;
    status?: "DRAFT" | undefined;
    hodUserId?: string | undefined;
    submittedAt?: unknown;
    reviewedAt?: unknown;
    rejectionReason?: string | undefined;
    changeComment?: string | undefined;
    hodComment?: string | undefined;
}, {
    departmentId: string;
    studentId: string;
    studentUserId: string;
    eventName: string;
    purpose: string;
    organizer: string;
    location: string;
    startDate: string;
    endDate: string;
    reason: string;
    createdAt?: unknown;
    updatedAt?: unknown;
    status?: "DRAFT" | undefined;
    hodUserId?: string | undefined;
    submittedAt?: unknown;
    reviewedAt?: unknown;
    rejectionReason?: string | undefined;
    changeComment?: string | undefined;
    hodComment?: string | undefined;
}>;
export declare const odDocumentSchema: z.ZodObject<{
    fileName: z.ZodString;
    fileType: z.ZodEnum<["application/pdf", "image/png", "image/jpeg"]>;
    fileSize: z.ZodNumber;
    storagePath: z.ZodString;
    uploadedBy: z.ZodString;
    uploadedAt: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    fileName: string;
    fileType: "application/pdf" | "image/png" | "image/jpeg";
    fileSize: number;
    storagePath: string;
    uploadedBy: string;
    uploadedAt?: unknown;
}, {
    fileName: string;
    fileType: "application/pdf" | "image/png" | "image/jpeg";
    fileSize: number;
    storagePath: string;
    uploadedBy: string;
    uploadedAt?: unknown;
}>;
export declare const odPassStatusSchema: z.ZodEnum<["ACTIVE", "REVOKED", "EXPIRED"]>;
export declare const odPassSchema: z.ZodObject<{
    requestId: z.ZodString;
    studentUserId: z.ZodString;
    hodUserId: z.ZodString;
    departmentId: z.ZodString;
    approvalId: z.ZodString;
    qrTokenHash: z.ZodString;
    digitalSignature: z.ZodString;
    status: z.ZodEnum<["ACTIVE", "REVOKED", "EXPIRED"]>;
    issuedAt: z.ZodOptional<z.ZodUnknown>;
    revokedAt: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
    revokedBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    revokeReason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "REVOKED" | "ACTIVE" | "EXPIRED";
    departmentId: string;
    studentUserId: string;
    hodUserId: string;
    requestId: string;
    approvalId: string;
    qrTokenHash: string;
    digitalSignature: string;
    issuedAt?: unknown;
    revokedAt?: unknown;
    revokedBy?: string | null | undefined;
    revokeReason?: string | undefined;
}, {
    status: "REVOKED" | "ACTIVE" | "EXPIRED";
    departmentId: string;
    studentUserId: string;
    hodUserId: string;
    requestId: string;
    approvalId: string;
    qrTokenHash: string;
    digitalSignature: string;
    issuedAt?: unknown;
    revokedAt?: unknown;
    revokedBy?: string | null | undefined;
    revokeReason?: string | undefined;
}>;
export declare const notificationSchema: z.ZodObject<{
    userId: z.ZodString;
    title: z.ZodString;
    body: z.ZodString;
    type: z.ZodEnum<["OD_SUBMITTED", "OD_APPROVED", "OD_REJECTED", "OD_CHANGES_REQUESTED", "OD_PASS_GENERATED", "OD_PASS_REVOKED"]>;
    entityType: z.ZodString;
    entityId: z.ZodString;
    isRead: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "OD_SUBMITTED" | "OD_APPROVED" | "OD_REJECTED" | "OD_CHANGES_REQUESTED" | "OD_PASS_GENERATED" | "OD_PASS_REVOKED";
    userId: string;
    title: string;
    body: string;
    entityType: string;
    entityId: string;
    isRead: boolean;
    createdAt?: unknown;
}, {
    type: "OD_SUBMITTED" | "OD_APPROVED" | "OD_REJECTED" | "OD_CHANGES_REQUESTED" | "OD_PASS_GENERATED" | "OD_PASS_REVOKED";
    userId: string;
    title: string;
    body: string;
    entityType: string;
    entityId: string;
    createdAt?: unknown;
    isRead?: boolean | undefined;
}>;
export declare const submitODRequestInputSchema: z.ZodObject<{
    requestId: z.ZodOptional<z.ZodString>;
    eventName: z.ZodString;
    purpose: z.ZodString;
    organizer: z.ZodString;
    location: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    reason: z.ZodString;
    documentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    eventName: string;
    purpose: string;
    organizer: string;
    location: string;
    startDate: string;
    endDate: string;
    reason: string;
    requestId?: string | undefined;
    documentIds?: string[] | undefined;
}, {
    eventName: string;
    purpose: string;
    organizer: string;
    location: string;
    startDate: string;
    endDate: string;
    reason: string;
    requestId?: string | undefined;
    documentIds?: string[] | undefined;
}>;
export declare const approveODRequestInputSchema: z.ZodObject<{
    requestId: z.ZodString;
    comment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    requestId: string;
    comment?: string | undefined;
}, {
    requestId: string;
    comment?: string | undefined;
}>;
export declare const rejectODRequestInputSchema: z.ZodObject<{
    requestId: z.ZodString;
    rejectionReason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    rejectionReason: string;
    requestId: string;
}, {
    rejectionReason: string;
    requestId: string;
}>;
export declare const requestODChangesInputSchema: z.ZodObject<{
    requestId: z.ZodString;
    changeComment: z.ZodString;
}, "strip", z.ZodTypeAny, {
    changeComment: string;
    requestId: string;
}, {
    changeComment: string;
    requestId: string;
}>;
export declare const revokeODPassInputSchema: z.ZodObject<{
    passId: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    passId: string;
}, {
    reason: string;
    passId: string;
}>;
export declare const registerDeviceTokenInputSchema: z.ZodObject<{
    fcmToken: z.ZodString;
    platform: z.ZodEnum<["android", "ios", "web"]>;
    deviceId: z.ZodString;
    appVersion: z.ZodString;
}, "strip", z.ZodTypeAny, {
    fcmToken: string;
    platform: "android" | "ios" | "web";
    deviceId: string;
    appVersion: string;
}, {
    fcmToken: string;
    platform: "android" | "ios" | "web";
    deviceId: string;
    appVersion: string;
}>;
export declare const markNotificationReadInputSchema: z.ZodObject<{
    notificationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    notificationId: string;
}, {
    notificationId: string;
}>;
export declare const verifyODPassQuerySchema: z.ZodObject<{
    approvalId: z.ZodString;
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    approvalId: string;
    token: string;
}, {
    approvalId: string;
    token: string;
}>;
//# sourceMappingURL=index.d.ts.map