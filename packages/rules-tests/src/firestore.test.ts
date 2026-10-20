import { COLLECTIONS } from '@campusflow/shared';
import { describe, it } from 'vitest';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

import { IDS } from './fixtures';
import {
  assertFails,
  assertSucceeds,
  authedDb,
  deleteDoc,
  doc,
  getDoc,
  getTestEnv,
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

describe('Firestore — Doubt Exchange', () => {
  const doubt = {
    authorId: IDS.studentA,
    authorAlias: 'Curious Fox',
    departmentId: IDS.deptCse,
    departmentName: 'CSE',
    year: '2',
    title: 'Why do databases need indexes?',
    context: 'I understand searching, but I do not understand why an index makes it faster.',
    category: 'TECH',
    helpModes: ['EXPLAIN', 'EXAMPLE'],
    urgency: 'STUCK',
    status: 'OPEN',
    branchCount: 0,
    sessionSupporterIds: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('lets a student launch their own anonymous doubt signal', async () => {
    await seed(IDS);
    await assertSucceeds(setDoc(doc(authedDb(IDS.studentA), 'doubts', 'doubt-a'), doubt));
  });

  it('rejects a student impersonating another doubt author', async () => {
    await seed(IDS);
    await assertFails(setDoc(doc(authedDb(IDS.studentB), 'doubts', 'doubt-a'), doubt));
  });

  it('supports legacy students whose user record predates isActive', async () => {
    await seed(IDS);
    await getTestEnv().withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), COLLECTIONS.USERS, IDS.studentA), {
        uid: IDS.studentA,
        name: 'Legacy Student',
        email: 'legacy@citchennai.net',
        role: 'STUDENT',
      });
    });
    await assertSucceeds(setDoc(doc(authedDb(IDS.studentA), 'doubts', 'legacy-doubt'), doubt));
  });

  it('keeps explicitly deactivated students out of the exchange', async () => {
    await seed(IDS);
    await getTestEnv().withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), COLLECTIONS.USERS, IDS.studentA), { isActive: false });
    });
    await assertFails(setDoc(doc(authedDb(IDS.studentA), 'doubts', 'blocked-doubt'), doubt));
  });

  it('allows another student to add a separate answer branch', async () => {
    await seed(IDS);
    await assertSucceeds(setDoc(doc(authedDb(IDS.studentA), 'doubts', 'doubt-a'), doubt));
    await assertSucceeds(setDoc(doc(authedDb(IDS.studentB), 'doubtBranches', 'branch-b'), {
      doubtId: 'doubt-a',
      authorId: IDS.studentB,
      authorAlias: 'Bright Owl',
      departmentName: 'ECE',
      angle: 'EXAMPLE',
      body: 'A book index lets you jump to one topic instead of reading every page from the start.',
      helpfulByUserIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it('lets a student add only their own session support', async () => {
    await seed(IDS);
    await assertSucceeds(setDoc(doc(authedDb(IDS.studentA), 'doubts', 'doubt-a'), doubt));
    await assertSucceeds(updateDoc(doc(authedDb(IDS.studentB), 'doubts', 'doubt-a'), {
      sessionSupporterIds: [IDS.studentB],
      updatedAt: new Date(),
    }));
    await assertFails(updateDoc(doc(authedDb(IDS.studentB), 'doubts', 'doubt-a'), {
      sessionSupporterIds: [IDS.studentB, IDS.admin],
      updatedAt: new Date(),
    }));
  });
});

describe('Firestore — event broadcasts', () => {
  async function seedBroadcast() {
    await seed(IDS);
    await getTestEnv().withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, COLLECTIONS.EVENTS, 'broadcast-event'), {
        title: 'Broadcast event', status: 'PUBLISHED', organizerUserId: IDS.studentA,
      });
      await setDoc(doc(adminDb, COLLECTIONS.EVENT_ANNOUNCEMENTS, 'announcement-a'), {
        eventId: 'broadcast-event', eventTitle: 'Broadcast event', organizerUserId: IDS.studentA,
        organizerName: 'Host', message: 'Report fifteen minutes early.', priority: 'IMPORTANT',
        audience: 'APPROVED', isPinned: true, recipientCount: 1, acknowledgedCount: 0,
      });
      await setDoc(doc(adminDb, COLLECTIONS.EVENT_ANNOUNCEMENT_RECEIPTS, `announcement-a_${IDS.studentB}`), {
        announcementId: 'announcement-a', eventId: 'broadcast-event', userId: IDS.studentB,
        isActive: true, readAt: null, acknowledgedAt: null,
      });
    });
  }

  it('allows the host and intended attendee to read a broadcast', async () => {
    await seedBroadcast();
    await assertSucceeds(getDoc(doc(authedDb(IDS.studentA), COLLECTIONS.EVENT_ANNOUNCEMENTS, 'announcement-a')));
    await assertSucceeds(getDoc(doc(authedDb(IDS.studentB), COLLECTIONS.EVENT_ANNOUNCEMENTS, 'announcement-a')));
  });

  it('allows only the constrained host timeline and attendee receipt queries used by the app', async () => {
    await seedBroadcast();
    await assertSucceeds(getDocs(query(
      collection(authedDb(IDS.studentA), COLLECTIONS.EVENT_ANNOUNCEMENTS),
      where('eventId', '==', 'broadcast-event'),
      where('organizerUserId', '==', IDS.studentA),
      orderBy('createdAt', 'desc'),
    )));
    await assertSucceeds(getDocs(query(
      collection(authedDb(IDS.studentB), COLLECTIONS.EVENT_ANNOUNCEMENT_RECEIPTS),
      where('eventId', '==', 'broadcast-event'),
      where('userId', '==', IDS.studentB),
    )));
    await assertFails(getDocs(query(
      collection(authedDb(IDS.hod), COLLECTIONS.EVENT_ANNOUNCEMENT_RECEIPTS),
      where('eventId', '==', 'broadcast-event'),
      where('userId', '==', IDS.studentB),
    )));
  });

  it('denies non-recipients and revoked recipients', async () => {
    await seedBroadcast();
    await assertFails(getDoc(doc(authedDb(IDS.hod), COLLECTIONS.EVENT_ANNOUNCEMENTS, 'announcement-a')));
    await getTestEnv().withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), COLLECTIONS.EVENT_ANNOUNCEMENT_RECEIPTS, `announcement-a_${IDS.studentB}`), { isActive: false });
    });
    await assertFails(getDoc(doc(authedDb(IDS.studentB), COLLECTIONS.EVENT_ANNOUNCEMENTS, 'announcement-a')));
  });

  it('prevents clients from publishing or forging acknowledgements', async () => {
    await seedBroadcast();
    await assertFails(setDoc(doc(authedDb(IDS.studentA), COLLECTIONS.EVENT_ANNOUNCEMENTS, 'forged'), {
      eventId: 'broadcast-event', message: 'Forged', organizerUserId: IDS.studentA,
    }));
    await assertFails(updateDoc(doc(authedDb(IDS.studentB), COLLECTIONS.EVENT_ANNOUNCEMENT_RECEIPTS, `announcement-a_${IDS.studentB}`), { acknowledgedAt: new Date() }));
  });
});

describe('Firestore — server-only collections', () => {
  it('allows only admins to read mobile diagnostics and denies all client writes', async () => {
    await seed(IDS);
    await getTestEnv().withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), COLLECTIONS.CLIENT_ERROR_REPORTS, 'error-a'), {
        userId: IDS.studentA,
        feature: 'EVENT_TICKET',
        message: 'Ticket failed',
      });
    });

    await assertSucceeds(getDoc(doc(authedDb(IDS.admin), COLLECTIONS.CLIENT_ERROR_REPORTS, 'error-a')));
    await assertFails(getDoc(doc(authedDb(IDS.studentA), COLLECTIONS.CLIENT_ERROR_REPORTS, 'error-a')));
    await assertFails(setDoc(doc(authedDb(IDS.admin), COLLECTIONS.CLIENT_ERROR_REPORTS, 'forged'), {
      userId: IDS.studentA,
      feature: 'UNKNOWN',
      message: 'Forged',
    }));
  });

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
