import assert from 'node:assert/strict';

const projectId = 'campusflow-f798c';
const region = 'asia-south1';
const functionsBase = `http://127.0.0.1:5005/${projectId}/${region}`;
const authBase = 'http://127.0.0.1:9095/identitytoolkit.googleapis.com/v1';
const firestoreBase = `http://127.0.0.1:8085/v1/projects/${projectId}/databases/(default)/documents`;
const stamp = Date.now();
const password = 'EventAttendanceTest123!';

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function call(name, data, idToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  const { response, body } = await request(`${functionsBase}/${name}`, {
    method: 'POST', headers, body: JSON.stringify({ data }),
  });
  assert.equal(response.ok, true, `${name} failed: ${JSON.stringify(body)}`);
  return body.data ?? body.result;
}

async function clearTicketToSimulateLegacyRegistration(registrationId) {
  const url = `${firestoreBase}/eventRegistrations/${registrationId}?updateMask.fieldPaths=ticketToken&updateMask.fieldPaths=ticketIssuedAt`;
  const { response, body } = await request(url, {
    method: 'PATCH',
    // `owner` is the Firestore emulator's documented admin token. This request
    // prepares a legacy server-created record; normal clients remain denied.
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({
      fields: {
        ticketToken: { nullValue: null },
        ticketIssuedAt: { nullValue: null },
      },
    }),
  });
  assert.equal(response.ok, true, `Failed to prepare legacy ticket test: ${JSON.stringify(body)}`);
}

async function createStudent(label) {
  const email = `${label}${stamp}@citchennai.net`;
  const registerNumber = `${label.toUpperCase()}-${stamp}`;
  const registration = await call('registerStudent', {
    email, password, username: `${label}${stamp}`, registerNumber,
    departmentId: 'unassigned', year: '1', section: 'A',
  });
  const signIn = await request(`${authBase}/accounts:signInWithPassword?key=test-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  assert.equal(signIn.response.status, 200, `Sign-in failed for ${label}`);
  return { ...registration, idToken: signIn.body.idToken, registerNumber, name: `${label} student`, phoneNumber: '+91 98765 43210' };
}

const registrationPayload = (eventId, student) => ({
  eventId,
  attendeeName: student.name,
  registerNumber: student.registerNumber,
  phoneNumber: student.phoneNumber,
});

const organizer = await createStudent('organizer');
const attendee = await createStudent('attendee');
const attendeeTwo = await createStudent('attendeetwo');
const now = Date.now();
const event = await call('createEvent', {
  title: `Attendance test ${stamp}`,
  description: 'A disposable integration test for event attendance and QR tickets.',
  type: 'WORKSHOP', departmentId: null, venue: 'Test hall',
  registrationDeadline: new Date(now + 86_400_000).toISOString(),
  startAt: new Date(now + 172_800_000).toISOString(),
  endAt: new Date(now + 176_400_000).toISOString(),
  maxParticipants: 10, approvalMode: 'MANUAL', tags: [],
}, organizer.idToken);

const firstRegistration = await call('registerForEvent', registrationPayload(event.eventId, attendee), attendee.idToken);
assert.equal(firstRegistration.status, 'PENDING');

await call('approveEventRegistration', { registrationId: firstRegistration.registrationId }, organizer.idToken);
await clearTicketToSimulateLegacyRegistration(firstRegistration.registrationId);
const announcement = await call('publishEventAnnouncement', {
  requestId: 'event-test-announcement-0001',
  eventId: event.eventId,
  message: 'Please report to Test hall fifteen minutes early.',
  priority: 'IMPORTANT',
  audience: 'APPROVED',
  isPinned: true,
}, organizer.idToken);
assert.equal(announcement.recipientCount, 1);
const retriedAnnouncement = await call('publishEventAnnouncement', {
  requestId: 'event-test-announcement-0001',
  eventId: event.eventId,
  message: 'Please report to Test hall fifteen minutes early.',
  priority: 'IMPORTANT',
  audience: 'APPROVED',
  isPinned: true,
}, organizer.idToken);
assert.equal(retriedAnnouncement.announcementId, announcement.announcementId, 'A retried broadcast must reuse the original announcement.');
assert.equal(retriedAnnouncement.deliveredCount, 1, 'A retried broadcast must not duplicate recipient delivery.');
const acknowledged = await call('acknowledgeEventAnnouncement', { announcementId: announcement.announcementId }, attendee.idToken);
assert.equal(acknowledged.acknowledged, true);
const simultaneousTickets = await Promise.all(
  Array.from({ length: 12 }, () => call('getEventTicket', { eventId: event.eventId }, attendee.idToken))
);
assert.equal(
  new Set(simultaneousTickets.map((item) => item.qrValue)).size,
  1,
  'Simultaneous ticket requests must all return the same valid QR payload.'
);
const ticket = simultaneousTickets[0];
const [, registrationId, ticketToken] = ticket.qrValue.split(':');
assert.equal(registrationId, firstRegistration.registrationId);
assert.ok(ticketToken?.length > 20, 'Approved attendee must receive a strong ticket token.');
assert.equal(ticket.qrValue, `CITIANS-EVENT:${firstRegistration.registrationId}:${ticketToken}`);

const checkedIn = await call('checkInEventAttendee', { registrationId, ticketToken }, organizer.idToken);
assert.equal(checkedIn.status, 'VALID');
const repeatedScan = await call('checkInEventAttendee', { registrationId, ticketToken }, organizer.idToken);
assert.equal(repeatedScan.status, 'ALREADY_CHECKED_IN');

const secondRegistration = await call('registerForEvent', registrationPayload(event.eventId, attendeeTwo), attendeeTwo.idToken);
assert.equal(secondRegistration.status, 'PENDING');
const approveAllResults = await Promise.all([
  call('approveAllEventRegistrations', { eventId: event.eventId }, organizer.idToken),
  call('approveAllEventRegistrations', { eventId: event.eventId }, organizer.idToken),
]);
assert.equal(
  approveAllResults.reduce((total, result) => total + result.approvedCount, 0),
  1,
  'Competing bulk approvals must approve each pending registration exactly once.'
);
assert.ok(approveAllResults.every((result) => result.hasMore === false));
const removed = await call('removeEventAttendee', { registrationId: secondRegistration.registrationId }, organizer.idToken);
assert.equal(removed.status, 'REJECTED');

const rushEvent = await call('createEvent', {
  title: `Registration rush ${stamp}`,
  description: 'A one-seat event used to verify atomic capacity and automatic waitlist promotion.',
  type: 'MEETUP', departmentId: null, venue: 'Test room',
  registrationDeadline: new Date(now + 86_400_000).toISOString(),
  startAt: new Date(now + 172_800_000).toISOString(),
  endAt: new Date(now + 176_400_000).toISOString(),
  maxParticipants: 1, approvalMode: 'AUTO', tags: [],
}, organizer.idToken);

const rushResults = await Promise.all([
  call('registerForEvent', registrationPayload(rushEvent.eventId, attendee), attendee.idToken),
  call('registerForEvent', registrationPayload(rushEvent.eventId, attendeeTwo), attendeeTwo.idToken),
]);
assert.deepEqual(rushResults.map((result) => result.status).sort(), ['APPROVED', 'WAITLISTED']);

const winnerIndex = rushResults.findIndex((result) => result.status === 'APPROVED');
const winner = winnerIndex === 0 ? attendee : attendeeTwo;
const waiting = winnerIndex === 0 ? attendeeTwo : attendee;
await call('unregisterFromEvent', { eventId: rushEvent.eventId }, winner.idToken);
const promotedTicket = await call('getEventTicket', { eventId: rushEvent.eventId }, waiting.idToken);
assert.ok(promotedTicket.qrValue.startsWith('CITIANS-EVENT:'), 'The first waitlisted student must receive the freed seat.');

console.log('Event attendance integration test passed: contact capture, approval, secure broadcasts, acknowledgement, removal, atomic QR issuance, QR check-in, atomic capacity, waitlisting, promotion, duplicate protection, and approve-all.');
