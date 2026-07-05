import { COLLECTIONS } from '@campusflow/shared';
import { describe, it } from 'vitest';

import { IDS } from './fixtures';
import {
  assertFails,
  assertSucceeds,
  authedDb,
  deleteDoc,
  doc,
  getDoc,
  seed,
  setDoc,
  unauthedDb,
  updateDoc,
} from './setup';

describe('Firestore — users', () => {
  it('denies unauthenticated reads', async () => {
    await seed(IDS);
    await assertFails(getDoc(doc(unauthedDb(), COLLECTIONS.USERS, IDS.studentA)));
  });

  it('allows students to read their own profile', async () => {
    await seed(IDS);
    await assertSucceeds(getDoc(doc(authedDb(IDS.studentA), COLLECTIONS.USERS, IDS.studentA)));
  });

  it('denies students reading other users', async () => {
    await seed(IDS);
    await assertFails(getDoc(doc(authedDb(IDS.studentA), COLLECTIONS.USERS, IDS.studentB)));
  });

  it('allows HOD to read students in their department', async () => {
    await seed(IDS);
    await assertSucceeds(getDoc(doc(authedDb(IDS.hod), COLLECTIONS.USERS, IDS.studentA)));
  });

  it('denies HOD reading students outside their department', async () => {
    await seed(IDS);
    await assertFails(getDoc(doc(authedDb(IDS.hod), COLLECTIONS.USERS, IDS.studentB)));
  });

  it('allows admin to read any user', async () => {
    await seed(IDS);
    await assertSucceeds(getDoc(doc(authedDb(IDS.admin), COLLECTIONS.USERS, IDS.studentB)));
  });

  it('denies non-admin user creation', async () => {
    await seed(IDS);
    await assertFails(
      setDoc(doc(authedDb(IDS.studentA), COLLECTIONS.USERS, 'new-user'), {
        uid: 'new-user',
        name: 'New',
        email: 'new@test.net',
        role: 'STUDENT',
        isActive: true,
      })
    );
  });

  it('allows admin user creation', async () => {
    await seed(IDS);
    await assertSucceeds(
      setDoc(doc(authedDb(IDS.admin), COLLECTIONS.USERS, 'new-user'), {
        uid: 'new-user',
        name: 'New',
        email: 'new@test.net',
        role: 'STUDENT',
        isActive: true,
      })
    );
  });
});

describe('Firestore — students & hods', () => {
  it('allows students to read their own student profile', async () => {
    await seed(IDS);
    await assertSucceeds(getDoc(doc(authedDb(IDS.studentA), COLLECTIONS.STUDENTS, IDS.studentA)));
  });

  it('denies students writing student profiles', async () => {
    await seed(IDS);
    await assertFails(
      updateDoc(doc(authedDb(IDS.studentA), COLLECTIONS.STUDENTS, IDS.studentA), { year: '4' })
    );
  });

  it('allows HOD to read students in their department', async () => {
    await seed(IDS);
    await assertSucceeds(getDoc(doc(authedDb(IDS.hod), COLLECTIONS.STUDENTS, IDS.studentA)));
  });

  it('denies HOD reading students outside department', async () => {
    await seed(IDS);
    await assertFails(getDoc(doc(authedDb(IDS.hod), COLLECTIONS.STUDENTS, IDS.studentB)));
  });

  it('allows HOD to read their own hod profile', async () => {
    await seed(IDS);
    await assertSucceeds(getDoc(doc(authedDb(IDS.hod), COLLECTIONS.HODS, IDS.hod)));
  });

  it('denies students reading hod profiles', async () => {
    await seed(IDS);
    await assertFails(getDoc(doc(authedDb(IDS.studentA), COLLECTIONS.HODS, IDS.hod)));
  });
});

describe('Firestore — departments', () => {
  it('allows authenticated users to read departments', async () => {
    await seed(IDS);
    await assertSucceeds(getDoc(doc(authedDb(IDS.studentA), COLLECTIONS.DEPARTMENTS, IDS.deptCse)));
  });

  it('denies non-admin department writes', async () => {
    await seed(IDS);
    await assertFails(
      updateDoc(doc(authedDb(IDS.hod), COLLECTIONS.DEPARTMENTS, IDS.deptCse), { name: 'Changed' })
    );
  });

  it('allows admin department writes', async () => {
    await seed(IDS);
    await assertSucceeds(
      updateDoc(doc(authedDb(IDS.admin), COLLECTIONS.DEPARTMENTS, IDS.deptCse), { name: 'CSE Updated' })
    );
  });
});

describe('Firestore — odRequests', () => {
  it('allows student to read own requests', async () => {
    await seed(IDS);
    await assertSucceeds(getDoc(doc(authedDb(IDS.studentA), COLLECTIONS.OD_REQUESTS, IDS.requestDraft)));
  });

  it('allows HOD to read requests in their department', async () => {
    await seed(IDS);
    await assertSucceeds(getDoc(doc(authedDb(IDS.hod), COLLECTIONS.OD_REQUESTS, IDS.requestPending)));
  });

  it('denies HOD reading requests outside department', async () => {
    await seed(IDS);
    await assertFails(getDoc(doc(authedDb(IDS.hod), COLLECTIONS.OD_REQUESTS, IDS.requestOtherDept)));
  });

  it('allows student to create a DRAFT request', async () => {
    await seed(IDS);
    await assertSucceeds(
      setDoc(doc(authedDb(IDS.studentA), COLLECTIONS.OD_REQUESTS, 'req-new-draft'), {
        studentId: IDS.studentA,
        studentUserId: IDS.studentA,
        departmentId: IDS.deptCse,
        hodUserId: IDS.hod,
        eventName: 'Workshop',
        purpose: 'Learning',
        organizer: 'Dept',
        location: 'Lab',
        startDate: '2026-08-01',
        endDate: '2026-08-01',
        reason: 'Skill building',
        status: 'DRAFT',
      })
    );
  });

  it('denies student creating request for another student', async () => {
    await seed(IDS);
    await assertFails(
      setDoc(doc(authedDb(IDS.studentA), COLLECTIONS.OD_REQUESTS, 'req-spoof'), {
        studentId: IDS.studentB,
        studentUserId: IDS.studentB,
        departmentId: IDS.deptCse,
        hodUserId: IDS.hod,
        eventName: 'Spoof',
        purpose: 'Bad',
        organizer: 'X',
        location: 'Y',
        startDate: '2026-08-01',
        endDate: '2026-08-01',
        reason: 'No',
        status: 'DRAFT',
      })
    );
  });

  it('denies student escalating status to APPROVED', async () => {
    await seed(IDS);
    await assertFails(
      updateDoc(doc(authedDb(IDS.studentA), COLLECTIONS.OD_REQUESTS, IDS.requestDraft), {
        status: 'APPROVED',
      })
    );
  });

  it('allows student to update their DRAFT request', async () => {
    await seed(IDS);
    await assertSucceeds(
      updateDoc(doc(authedDb(IDS.studentA), COLLECTIONS.OD_REQUESTS, IDS.requestDraft), {
        eventName: 'Updated Hackathon',
      })
    );
  });

  it('allows student to delete their DRAFT request', async () => {
    await seed(IDS);
    await assertSucceeds(
      deleteDoc(doc(authedDb(IDS.studentA), COLLECTIONS.OD_REQUESTS, IDS.requestDraft))
    );
  });

  it('denies student deleting submitted request', async () => {
    await seed(IDS);
    await assertFails(
      deleteDoc(doc(authedDb(IDS.studentA), COLLECTIONS.OD_REQUESTS, IDS.requestPending))
    );
  });
});

describe('Firestore — odRequest documents subcollection', () => {
  it('allows student to read documents on own request', async () => {
    await seed(IDS);
    await assertSucceeds(
      getDoc(
        doc(
          authedDb(IDS.studentA),
          COLLECTIONS.OD_REQUESTS,
          IDS.requestDraft,
          'documents',
          'doc-001'
        )
      )
    );
  });

  it('allows HOD to read documents on department request', async () => {
    await seed(IDS);
    await assertSucceeds(
      getDoc(
        doc(
          authedDb(IDS.hod),
          COLLECTIONS.OD_REQUESTS,
          IDS.requestDraft,
          'documents',
          'doc-001'
        )
      )
    );
  });

  it('allows student to add document metadata on DRAFT request', async () => {
    await seed(IDS);
    await assertSucceeds(
      setDoc(
        doc(
          authedDb(IDS.studentA),
          COLLECTIONS.OD_REQUESTS,
          IDS.requestDraft,
          'documents',
          'doc-002'
        ),
        {
          fileName: 'letter.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
          storagePath: `odRequests/${IDS.requestDraft}/documents/letter.pdf`,
          uploadedBy: IDS.studentA,
        }
      )
    );
  });
});

describe('Firestore — odPasses', () => {
  it('allows student to read own pass', async () => {
    await seed(IDS);
    await assertSucceeds(getDoc(doc(authedDb(IDS.studentA), COLLECTIONS.OD_PASSES, IDS.passActive)));
  });

  it('allows HOD to read passes in department', async () => {
    await seed(IDS);
    await assertSucceeds(getDoc(doc(authedDb(IDS.hod), COLLECTIONS.OD_PASSES, IDS.passActive)));
  });

  it('denies all client writes to odPasses', async () => {
    await seed(IDS);
    await assertFails(
      updateDoc(doc(authedDb(IDS.admin), COLLECTIONS.OD_PASSES, IDS.passActive), { status: 'REVOKED' })
    );
    await assertFails(
      setDoc(doc(authedDb(IDS.studentA), COLLECTIONS.OD_PASSES, 'pass-new'), {
        requestId: IDS.requestPending,
        studentUserId: IDS.studentA,
        status: 'ACTIVE',
      })
    );
  });
});

describe('Firestore — notifications', () => {
  it('allows owner to read notifications', async () => {
    await seed(IDS);
    await assertSucceeds(
      getDoc(doc(authedDb(IDS.studentA), COLLECTIONS.NOTIFICATIONS, IDS.notificationA))
    );
  });

  it('denies reading another user notifications', async () => {
    await seed(IDS);
    await assertFails(
      getDoc(doc(authedDb(IDS.studentB), COLLECTIONS.NOTIFICATIONS, IDS.notificationA))
    );
  });

  it('allows owner to mark notification as read', async () => {
    await seed(IDS);
    await assertSucceeds(
      updateDoc(doc(authedDb(IDS.studentA), COLLECTIONS.NOTIFICATIONS, IDS.notificationA), {
        isRead: true,
      })
    );
  });

  it('denies client notification creation', async () => {
    await seed(IDS);
    await assertFails(
      setDoc(doc(authedDb(IDS.studentA), COLLECTIONS.NOTIFICATIONS, 'notif-new'), {
        userId: IDS.studentA,
        title: 'Fake',
        body: 'Fake',
        type: 'OD_APPROVED',
        entityType: 'odRequest',
        entityId: IDS.requestDraft,
        isRead: false,
      })
    );
  });
});

describe('Firestore — server-only collections', () => {
  it('allows admin to read audit logs', async () => {
    await seed(IDS);
    await assertSucceeds(getDoc(doc(authedDb(IDS.admin), COLLECTIONS.AUDIT_LOGS, IDS.auditLog)));
  });

  it('denies non-admin audit log reads', async () => {
    await seed(IDS);
    await assertFails(getDoc(doc(authedDb(IDS.studentA), COLLECTIONS.AUDIT_LOGS, IDS.auditLog)));
  });

  it('denies all client writes to audit logs', async () => {
    await seed(IDS);
    await assertFails(
      setDoc(doc(authedDb(IDS.admin), COLLECTIONS.AUDIT_LOGS, 'audit-new'), {
        action: 'TEST',
        entityType: 'test',
        entityId: 'x',
        actorUserId: IDS.admin,
      })
    );
  });

  it('denies all access to odPassSecrets', async () => {
    await seed(IDS);
    await assertFails(getDoc(doc(authedDb(IDS.admin), COLLECTIONS.OD_PASS_SECRETS, IDS.passSecret)));
    await assertFails(
      setDoc(doc(authedDb(IDS.admin), COLLECTIONS.OD_PASS_SECRETS, 'secret-new'), { plainToken: 'x' })
    );
  });

  it('denies client device token writes', async () => {
    await seed(IDS);
    await assertFails(
      setDoc(doc(authedDb(IDS.studentA), COLLECTIONS.DEVICE_TOKENS, 'token-new'), {
        userId: IDS.studentA,
        token: 'abc',
        platform: 'ios',
      })
    );
  });

  it('allows owner to read device tokens', async () => {
    await seed(IDS);
    await assertSucceeds(
      getDoc(doc(authedDb(IDS.studentA), COLLECTIONS.DEVICE_TOKENS, IDS.deviceToken))
    );
  });

  it('allows admin to read verification logs', async () => {
    await seed(IDS);
    await assertSucceeds(
      getDoc(doc(authedDb(IDS.admin), COLLECTIONS.VERIFICATION_LOGS, IDS.verificationLog))
    );
  });

  it('denies non-admin verification log reads', async () => {
    await seed(IDS);
    await assertFails(
      getDoc(doc(authedDb(IDS.hod), COLLECTIONS.VERIFICATION_LOGS, IDS.verificationLog))
    );
  });
});
