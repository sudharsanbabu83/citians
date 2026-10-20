import http from 'k6/http';
import { check, sleep } from 'k6';

const projectId = 'campusflow-f798c';
const region = 'asia-south1';
const url = `http://127.0.0.1:5005/${projectId}/${region}/submitODRequest`;

const idToken = __ENV.IDTOKEN;

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '20s', target: 10 },
    { duration: '10s', target: 0 },
  ],
};

export default function () {
  if (!idToken) {
    throw new Error('Missing env var IDTOKEN');
  }

  const payload = {
    data: {
      eventName: 'Hackathon',
      purpose: 'SIH',
      organizer: 'Citians',
      location: 'CIT Chennai',
      startDate: '2026-07-08',
      endDate: '2026-07-08',
      startTime: '10:00',
      endTime: '11:00',
      reason: 'Project work',
    },
  };

  const res = http.post(url, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    timeout: '30s',
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body has requestId': (r) => (r.body || '').includes('"requestId"'),
    'status is PENDING_HOD_REVIEW': (r) =>
      (r.body || '').includes('"status":"PENDING_HOD_REVIEW"'),
  });

  sleep(0.1);
}

