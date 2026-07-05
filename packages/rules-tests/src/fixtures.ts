import { COLLECTIONS } from '@campusflow/shared';
import { doc, setDoc, type Firestore } from 'firebase/firestore';

export const IDS = {
  admin: 'admin-001',
  hod: 'hod-cse-001',
  studentA: 'student-a-001',
  studentB: 'student-b-001',
  deptCse: 'cse',
  deptEce: 'ece',
  requestDraft: 'req-draft-001',
  requestPending: 'req-pending-001',
  requestOtherDept: 'req-ece-001',
  passActive: 'pass-active-001',
  notificationA: 'notif-a-001',
  auditLog: 'audit-001',
  verificationLog: 'verify-001',
  deviceToken: 'token-a-001',
  passSecret: 'secret-001',
} as const;

export type SeedIds = typeof IDS;

export async function seedBaseData(db: Firestore, ids: SeedIds = IDS): Promise<void> {
  const users = [
    { uid: ids.admin, name: 'Admin', email: 'admin@test.net', role: 'ADMIN' as const },
    { uid: ids.hod, name: 'HOD CSE', email: 'hod.cse@test.net', role: 'HOD' as const },
    { uid: ids.studentA, name: 'Student A', email: 'student.a@test.net', role: 'STUDENT' as const },
    { uid: ids.studentB, name: 'Student B', email: 'student.b@test.net', role: 'STUDENT' as const },
  ];

  for (const user of users) {
    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
      uid: user.uid,
      name: user.name,
      email: user.email,
      phone: '',
      role: user.role,
      isActive: true,
    });
  }

  await setDoc(doc(db, COLLECTIONS.DEPARTMENTS, ids.deptCse), {
    name: 'Computer Science',
    code: 'CSE',
    hodId: ids.hod,
    isActive: true,
  });

  await setDoc(doc(db, COLLECTIONS.DEPARTMENTS, ids.deptEce), {
    name: 'Electronics',
    code: 'ECE',
    hodId: null,
    isActive: true,
  });

  await setDoc(doc(db, COLLECTIONS.HODS, ids.hod), {
    userId: ids.hod,
    departmentId: ids.deptCse,
    designation: 'Head of Department',
  });

  await setDoc(doc(db, COLLECTIONS.STUDENTS, ids.studentA), {
    userId: ids.studentA,
    registerNumber: '21CSE001',
    departmentId: ids.deptCse,
    year: '3',
    section: 'A',
  });

  await setDoc(doc(db, COLLECTIONS.STUDENTS, ids.studentB), {
    userId: ids.studentB,
    registerNumber: '21ECE001',
    departmentId: ids.deptEce,
    year: '3',
    section: 'B',
  });

  const odRequestBase = {
    studentId: ids.studentA,
    studentUserId: ids.studentA,
    studentName: 'Student A',
    departmentId: ids.deptCse,
    hodUserId: ids.hod,
    eventName: 'Hackathon',
    purpose: 'Competition',
    organizer: 'College',
    location: 'Chennai',
    startDate: '2026-07-10',
    endDate: '2026-07-12',
    reason: 'Participation',
  };

  await setDoc(doc(db, COLLECTIONS.OD_REQUESTS, ids.requestDraft), {
    ...odRequestBase,
    status: 'DRAFT',
  });

  await setDoc(doc(db, COLLECTIONS.OD_REQUESTS, ids.requestPending), {
    ...odRequestBase,
    status: 'PENDING_HOD_REVIEW',
  });

  await setDoc(doc(db, COLLECTIONS.OD_REQUESTS, ids.requestOtherDept), {
    ...odRequestBase,
    studentId: ids.studentB,
    studentUserId: ids.studentB,
    studentName: 'Student B',
    departmentId: ids.deptEce,
    hodUserId: 'hod-ece-001',
    status: 'PENDING_HOD_REVIEW',
  });

  await setDoc(doc(db, COLLECTIONS.OD_PASSES, ids.passActive), {
    requestId: ids.requestPending,
    studentUserId: ids.studentA,
    hodUserId: ids.hod,
    departmentId: ids.deptCse,
    approvalId: 'OD-2026-001',
    qrTokenHash: 'abc123',
    digitalSignature: 'sig123',
    status: 'ACTIVE',
  });

  await setDoc(doc(db, COLLECTIONS.NOTIFICATIONS, ids.notificationA), {
    userId: ids.studentA,
    title: 'OD submitted',
    body: 'Your request was submitted',
    type: 'OD_SUBMITTED',
    entityType: 'odRequest',
    entityId: ids.requestPending,
    isRead: false,
  });

  await setDoc(doc(db, COLLECTIONS.AUDIT_LOGS, ids.auditLog), {
    actorUserId: ids.admin,
    action: 'USER_PROVISIONED',
    entityType: 'user',
    entityId: ids.studentA,
  });

  await setDoc(doc(db, COLLECTIONS.VERIFICATION_LOGS, ids.verificationLog), {
    approvalId: 'OD-2026-001',
    passId: ids.passActive,
    result: 'VALID',
    scannedBy: ids.hod,
  });

  await setDoc(doc(db, COLLECTIONS.DEVICE_TOKENS, ids.deviceToken), {
    userId: ids.studentA,
    token: 'fcm-token-demo',
    platform: 'android',
  });

  await setDoc(doc(db, COLLECTIONS.OD_PASS_SECRETS, ids.passSecret), {
    plainToken: 'secret-token',
  });

  await setDoc(
    doc(db, COLLECTIONS.OD_REQUESTS, ids.requestDraft, 'documents', 'doc-001'),
    {
      fileName: 'proof.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      storagePath: `odRequests/${ids.requestDraft}/documents/proof.pdf`,
      uploadedBy: ids.studentA,
    }
  );
}
