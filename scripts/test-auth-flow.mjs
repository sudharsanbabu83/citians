import assert from 'node:assert/strict';

const projectId = 'campusflow-f798c';
const region = 'asia-south1';
const functionsBase = `http://127.0.0.1:5005/${projectId}/${region}`;
const authBase = 'http://127.0.0.1:9095/identitytoolkit.googleapis.com/v1';
const firestoreBase = `http://127.0.0.1:8085/v1/projects/${projectId}/databases/(default)/documents`;
const stamp = Date.now();
const email = `authflow${stamp}@citchennai.net`;
const password = 'TestPassword123!';
const username = `authflow${stamp}`;

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function callFunction(name, data, idToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;

  const { response, body } = await request(`${functionsBase}/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data }),
  });

  if (!response.ok) {
    throw new Error(`${name} failed (${response.status}): ${JSON.stringify(body)}`);
  }

  return body.data ?? body.result;
}

async function readDocument(path, idToken) {
  const headers = idToken ? { Authorization: `Bearer ${idToken}` } : undefined;
  const { response, body } = await request(`${firestoreBase}/${path}`, { headers });
  assert.equal(response.status, 200, `Expected Firestore document ${path} to exist.`);
  return body;
}

const registration = await callFunction('registerStudent', {
  email,
  password,
  username,
  registerNumber: `AUTH-${stamp}`,
  departmentId: 'unassigned',
  year: '1',
  section: 'A',
});

assert.equal(registration.email, email);
assert.equal(registration.username, username);
assert.ok(registration.uid, 'Registration must return a user ID.');

const signIn = await request(`${authBase}/accounts:signInWithPassword?key=test-key`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, returnSecureToken: true }),
});
assert.equal(signIn.response.status, 200, `Password sign-in failed: ${JSON.stringify(signIn.body)}`);
assert.equal(signIn.body.localId, registration.uid);
assert.ok(signIn.body.idToken, 'Password sign-in must return an ID token.');

const userDocument = await readDocument(`users/${registration.uid}`, signIn.body.idToken);
assert.equal(userDocument.fields.email.stringValue, email);
assert.equal(userDocument.fields.username.stringValue, username);
assert.equal(userDocument.fields.role.stringValue, 'STUDENT');

const studentDocument = await readDocument(`students/${registration.uid}`, signIn.body.idToken);
assert.equal(studentDocument.fields.departmentId.stringValue, 'unassigned');
assert.equal(studentDocument.fields.registerNumber.stringValue, `AUTH-${stamp}`);

const departmentDocument = await readDocument('departments/unassigned');
assert.equal(departmentDocument.fields.name.stringValue, 'Unassigned');

const session = await callFunction(
  'claimUserSession',
  { sessionId: `test-session-${stamp}`, deviceLabel: 'integration-test' },
  signIn.body.idToken
);
assert.equal(session.success, true);

const duplicate = await request(`${functionsBase}/registerStudent`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: {
      email: `duplicate${stamp}@citchennai.net`,
      password,
      username,
      registerNumber: `DUP-${stamp}`,
      departmentId: 'unassigned',
      year: '1',
      section: 'A',
    },
  }),
});
assert.equal(duplicate.response.status, 409, 'Duplicate usernames must be rejected.');

const wrongPassword = await request(`${authBase}/accounts:signInWithPassword?key=test-key`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: 'incorrect-password', returnSecureToken: true }),
});
assert.equal(wrongPassword.response.status, 400, 'Invalid passwords must be rejected.');

console.log('Auth integration test passed: registration, profile creation, login, and session claim.');
