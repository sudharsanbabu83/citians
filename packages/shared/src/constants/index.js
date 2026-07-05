"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUDIT_ACTIONS = exports.MAX_FILE_SIZE_BYTES = exports.MAX_FILES_PER_REQUEST = exports.ALLOWED_FILE_TYPES = exports.COLLECTIONS = exports.VERIFICATION_RESULTS = exports.NOTIFICATION_TYPES = exports.OD_PASS_STATUSES = exports.OD_REQUEST_STATUSES = exports.ROLES = void 0;
exports.ROLES = ['STUDENT', 'HOD', 'ADMIN'];
exports.OD_REQUEST_STATUSES = [
    'DRAFT',
    'PENDING_HOD_REVIEW',
    'APPROVED',
    'REJECTED',
    'CHANGES_REQUESTED',
    'REVOKED',
];
exports.OD_PASS_STATUSES = ['ACTIVE', 'REVOKED', 'EXPIRED'];
exports.NOTIFICATION_TYPES = [
    'OD_SUBMITTED',
    'OD_APPROVED',
    'OD_REJECTED',
    'OD_CHANGES_REQUESTED',
    'OD_PASS_GENERATED',
    'OD_PASS_REVOKED',
];
exports.VERIFICATION_RESULTS = [
    'VALID',
    'INVALID',
    'REVOKED',
    'EXPIRED',
    'TAMPERED',
];
exports.COLLECTIONS = {
    USERS: 'users',
    STUDENTS: 'students',
    HODS: 'hods',
    DEPARTMENTS: 'departments',
    OD_REQUESTS: 'odRequests',
    OD_PASSES: 'odPasses',
    NOTIFICATIONS: 'notifications',
    DEVICE_TOKENS: 'deviceTokens',
    VERIFICATION_LOGS: 'verificationLogs',
    AUDIT_LOGS: 'auditLogs',
};
exports.ALLOWED_FILE_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
];
exports.MAX_FILES_PER_REQUEST = 5;
exports.MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
exports.AUDIT_ACTIONS = {
    OD_SUBMITTED: 'OD_SUBMITTED',
    OD_APPROVED: 'OD_APPROVED',
    OD_REJECTED: 'OD_REJECTED',
    OD_CHANGES_REQUESTED: 'OD_CHANGES_REQUESTED',
    OD_PASS_REVOKED: 'OD_PASS_REVOKED',
    OD_PASS_VERIFIED: 'OD_PASS_VERIFIED',
};
//# sourceMappingURL=index.js.map