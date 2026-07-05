/**
 * Emulator seed script — creates test department, users, and role profiles.
 *
 * Test credentials (password for all: password123):
 *   admin.campusflow@citchennai.net    — ADMIN
 *   hod.cse@citchennai.net             — HOD (CSE)
 *   arjunb1.cse2024@citchennai.net     — STUDENT (5 sample OD requests)
 *   meerab1.cse2024@citchennai.net     — STUDENT (1 pending OD request)
 *
 * To test inactive account blocking, set isActive: false on a user doc in Emulator UI.
 *
 * Usage (with emulators running):
 *   cd packages/functions && npm run seed
 */

import * as admin from 'firebase-admin';
import { createHash, createHmac } from 'crypto';
import { COLLECTIONS, FIREBASE_PROJECT_ID } from '@campusflow/shared';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? FIREBASE_PROJECT_ID;
const TEST_PASSWORD = 'password123';
const SEED_SIGNING_KEY = 'campusflow-emulator-signing-key-do-not-use-in-prod';
const SEED_QR_TOKEN = 'seed-demo-token-od-seed-001';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function signPassPayload(payload: Record<string, string>): string {
  const sortedPayload = Object.keys(payload)
    .sort()
    .map((key) => `${key}=${payload[key]}`)
    .join('&');
  return createHmac('sha256', SEED_SIGNING_KEY).update(sortedPayload).digest('hex');
}

process.env.FIRESTORE_EMULATOR_HOST ??= 'localhost:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= 'localhost:9095';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();
const auth = admin.auth();

interface SeedUser {
  email: string;
  name: string;
  role: 'ADMIN' | 'HOD' | 'STUDENT';
  phone?: string;
}

const SEED_USERS: SeedUser[] = [
  { email: 'admin.campusflow@citchennai.net', name: 'Campus Admin', role: 'ADMIN' },
  { email: 'hod.cse@citchennai.net', name: 'Dr. Priya Sharma', role: 'HOD', phone: '9876543210' },
  { email: 'arjunb1.cse2024@citchennai.net', name: 'Arjun Kumar', role: 'STUDENT', phone: '9123456780' },
  { email: 'meerab1.cse2024@citchennai.net', name: 'Meera Patel', role: 'STUDENT', phone: '9123456781' },
  { email: 'sudharsanb1.cse2024@citchennai.net', name: 'Sudharsan B', role: 'STUDENT', phone: '9123456782' },
];

const STUDENT_PROFILES: Record<string, { registerNumber: string; section: string }> = {
  'arjunb1.cse2024@citchennai.net': { registerNumber: '21CSE001', section: 'A' },
  'meerab1.cse2024@citchennai.net': { registerNumber: '21CSE002', section: 'B' },
  'sudharsanb1.cse2024@citchennai.net': { registerNumber: '21CSE003', section: 'A' },
};

async function ensureAuthUser(email: string, displayName: string): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, { password: TEST_PASSWORD, displayName });
    return existing.uid;
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code !== 'auth/user-not-found') throw err;
    const created = await auth.createUser({
      email,
      password: TEST_PASSWORD,
      displayName,
      emailVerified: true,
    });
    return created.uid;
  }
}

async function seed() {
  console.log('Seeding CampusFlow emulator data (Phase 3)...\n');

  const uids: Record<string, string> = {};

  for (const user of SEED_USERS) {
    uids[user.email] = await ensureAuthUser(user.email, user.name);
  }

  const hodUid = uids['hod.cse@citchennai.net']!;

  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  await db.collection(COLLECTIONS.DEPARTMENTS).doc('cse').set({
    name: 'Computer Science and Engineering',
    code: 'CSE',
    hodId: hodUid,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  for (const user of SEED_USERS) {
    const uid = uids[user.email]!;
    await db.collection(COLLECTIONS.USERS).doc(uid).set({
      uid,
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  await db.collection(COLLECTIONS.HODS).doc(hodUid).set({
    userId: hodUid,
    departmentId: 'cse',
    designation: 'Head of Department',
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  for (const user of SEED_USERS.filter((u) => u.role === 'STUDENT')) {
    const uid = uids[user.email]!;
    const profile = STUDENT_PROFILES[user.email];
    if (!profile) continue;

    await db.collection(COLLECTIONS.STUDENTS).doc(uid).set({
      userId: uid,
      registerNumber: profile.registerNumber,
      departmentId: 'cse',
      year: '3',
      section: profile.section,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  const student1Uid = uids['arjunb1.cse2024@citchennai.net']!;
  const student2Uid = uids['meerab1.cse2024@citchennai.net']!;

  const seedRequests = [
    {
      id: 'od-seed-001',
      studentId: student1Uid,
      studentUserId: student1Uid,
      eventName: 'Smart India Hackathon',
      purpose: 'Participate in national hackathon',
      organizer: 'AICTE',
      location: 'Chennai',
      startDate: '2026-07-10',
      endDate: '2026-07-15',
      reason: 'Representing college in SIH finals',
      status: 'APPROVED',
      daysAgo: 14,
    },
    {
      id: 'od-seed-002',
      studentId: student1Uid,
      studentUserId: student1Uid,
      eventName: 'Google Developer Student Club Summit',
      purpose: 'Attend GDSC lead summit',
      organizer: 'Google',
      location: 'Bangalore',
      startDate: '2026-04-10',
      endDate: '2026-04-12',
      reason: 'Campus GDSC lead participation',
      status: 'PENDING_HOD_REVIEW',
      daysAgo: 3,
    },
    {
      id: 'od-seed-003',
      studentId: student1Uid,
      studentUserId: student1Uid,
      eventName: 'Inter-College Coding Contest',
      purpose: 'Competitive programming event',
      organizer: 'CIT Events Cell',
      location: 'Coimbatore',
      startDate: '2026-02-20',
      endDate: '2026-02-20',
      reason: 'Missed prior deadline for proof upload',
      status: 'REJECTED',
      daysAgo: 30,
      rejectionReason: 'Insufficient documentation provided',
    },
    {
      id: 'od-seed-004',
      studentId: student1Uid,
      studentUserId: student1Uid,
      eventName: 'IEEE Technical Symposium',
      purpose: 'Present research paper',
      organizer: 'IEEE Student Branch',
      location: 'Chennai',
      startDate: '2026-05-05',
      endDate: '2026-05-06',
      reason: 'Paper presentation at symposium',
      status: 'CHANGES_REQUESTED',
      daysAgo: 7,
      changeComment: 'Please upload invitation letter from organizer',
    },
    {
      id: 'od-seed-005',
      studentId: student1Uid,
      studentUserId: student1Uid,
      eventName: 'Industry Visit — TCS',
      purpose: 'Industrial exposure visit',
      organizer: 'Placement Cell',
      location: 'Chennai',
      startDate: '2026-06-01',
      endDate: '2026-06-01',
      reason: 'Draft not yet submitted',
      status: 'DRAFT',
      daysAgo: 1,
    },
    {
      id: 'od-seed-006',
      studentId: student2Uid,
      studentUserId: student2Uid,
      eventName: 'National Level Workshop on AI',
      purpose: 'Hands-on AI workshop',
      organizer: 'ICT Academy',
      location: 'Chennai',
      startDate: '2026-04-20',
      endDate: '2026-04-21',
      reason: 'Skill development workshop',
      status: 'PENDING_HOD_REVIEW',
      daysAgo: 2,
    },
  ] as const;

  for (const req of seedRequests) {
    const createdAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - req.daysAgo * 24 * 60 * 60 * 1000)
    );
    const submittedAt =
      req.status === 'DRAFT'
        ? null
        : admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - (req.daysAgo - 1) * 24 * 60 * 60 * 1000)
          );

    const doc: Record<string, unknown> = {
      studentId: req.studentId,
      studentUserId: req.studentUserId,
      departmentId: 'cse',
      hodUserId: hodUid,
      eventName: req.eventName,
      purpose: req.purpose,
      organizer: req.organizer,
      location: req.location,
      startDate: req.startDate,
      endDate: req.endDate,
      reason: req.reason,
      status: req.status,
      submittedAt,
      reviewedAt: req.status === 'APPROVED' || req.status === 'REJECTED' ? timestamp : null,
      createdAt,
      updatedAt: timestamp,
    };

    if ('rejectionReason' in req) {
      doc.rejectionReason = req.rejectionReason;
    }
    if ('changeComment' in req) {
      doc.changeComment = req.changeComment;
    }

    await db.collection(COLLECTIONS.OD_REQUESTS).doc(req.id).set(doc);
  }

  const approvedPassId = 'od-pass-seed-001';
  const approvedApprovalId = 'OD-2026-90001';
  const approvedEndDate = '2026-07-15';
  const approvedSignature = signPassPayload({
    approvalId: approvedApprovalId,
    requestId: 'od-seed-001',
    studentUserId: student1Uid,
    endDate: approvedEndDate,
  });

  await db.collection(COLLECTIONS.OD_PASSES).doc(approvedPassId).set({
    requestId: 'od-seed-001',
    studentUserId: student1Uid,
    hodUserId: hodUid,
    departmentId: 'cse',
    approvalId: approvedApprovalId,
    qrTokenHash: hashToken(SEED_QR_TOKEN),
    digitalSignature: approvedSignature,
    status: 'ACTIVE',
    issuedAt: timestamp,
    revokedAt: null,
    revokedBy: null,
  });

  await db.collection(COLLECTIONS.OD_PASS_SECRETS).doc(approvedPassId).set({
    qrToken: SEED_QR_TOKEN,
    createdAt: timestamp,
  });

  console.log('Created department: cse (Computer Science and Engineering)');
  console.log('Created users, HOD profile, and student profiles.');
  console.log(`Created ${seedRequests.length} sample OD requests.`);
  console.log('Created digital OD pass for od-seed-001 (approved SIH request).\n');
  console.log('Test credentials (password for all: password123):');
  console.log('  admin.campusflow@citchennai.net    — ADMIN');
  console.log('  hod.cse@citchennai.net             — HOD');
  for (const user of SEED_USERS.filter((u) => u.role === 'STUDENT')) {
    console.log(`  ${user.email.padEnd(35)} — STUDENT`);
  }
  console.log('\nSeed complete.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
