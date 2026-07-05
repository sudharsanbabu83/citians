export declare const ROLES: readonly ["STUDENT", "HOD", "ADMIN"];
export type Role = (typeof ROLES)[number];
export declare const OD_REQUEST_STATUSES: readonly ["DRAFT", "PENDING_HOD_REVIEW", "APPROVED", "REJECTED", "CHANGES_REQUESTED", "REVOKED"];
export type ODRequestStatus = (typeof OD_REQUEST_STATUSES)[number];
export declare const OD_PASS_STATUSES: readonly ["ACTIVE", "REVOKED", "EXPIRED"];
export type ODPassStatus = (typeof OD_PASS_STATUSES)[number];
export declare const NOTIFICATION_TYPES: readonly ["OD_SUBMITTED", "OD_APPROVED", "OD_REJECTED", "OD_CHANGES_REQUESTED", "OD_PASS_GENERATED", "OD_PASS_REVOKED"];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export declare const VERIFICATION_RESULTS: readonly ["VALID", "INVALID", "REVOKED", "EXPIRED", "TAMPERED"];
export type VerificationResult = (typeof VERIFICATION_RESULTS)[number];
export declare const COLLECTIONS: {
    readonly USERS: "users";
    readonly STUDENTS: "students";
    readonly HODS: "hods";
    readonly DEPARTMENTS: "departments";
    readonly OD_REQUESTS: "odRequests";
    readonly OD_PASSES: "odPasses";
    readonly NOTIFICATIONS: "notifications";
    readonly DEVICE_TOKENS: "deviceTokens";
    readonly VERIFICATION_LOGS: "verificationLogs";
    readonly AUDIT_LOGS: "auditLogs";
};
export declare const ALLOWED_FILE_TYPES: readonly ["application/pdf", "image/png", "image/jpeg"];
export declare const MAX_FILES_PER_REQUEST = 5;
export declare const MAX_FILE_SIZE_BYTES: number;
export declare const AUDIT_ACTIONS: {
    readonly OD_SUBMITTED: "OD_SUBMITTED";
    readonly OD_APPROVED: "OD_APPROVED";
    readonly OD_REJECTED: "OD_REJECTED";
    readonly OD_CHANGES_REQUESTED: "OD_CHANGES_REQUESTED";
    readonly OD_PASS_REVOKED: "OD_PASS_REVOKED";
    readonly OD_PASS_VERIFIED: "OD_PASS_VERIFIED";
};
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
//# sourceMappingURL=index.d.ts.map