import http from 'k6/http';
import { check, sleep } from 'k6';

const projectId = 'campusflow-f798c';
const region = 'asia-south1';
const url = `http://127.0.0.1:5005/${projectId}/${region}/submitODRequest`;

const idToken = __ENV.IDTOKEN;
const requestIds = ['od-seed-004', 'od-seed-005'];

export const options = {
  stages: [
    { duration: '10s', target: 3 },
    { duration: '20s', target: 6 },
    { duration: '10s', target: 0 },
  ],
};

export default function () {
  if (!idToken) {
    throw new Error('Missing env var IDTOKEN');
  }

  // Updating an existing seeded request. First calls should succeed (DRAFT/CHANGES_REQUESTED),
  // then subsequent calls will fail once the request transitions to PENDING_HOD_REVIEW.
  const requestId = requestIds[Math.floor(Math.random() * requestIds.length)];

  const payload = {
    data: {
      requestId,
      eventName: 'AI Workshop',
      purpose: 'Hands-on',
      organizer: 'ICT Academy',
      location: 'Chennai',
      startDate: '2026-07-08',
      endDate: '2026-07-08',
      startTime: '10:00',
      endTime: '11:00',
      reason: 'Resubmission',
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
  });

  sleep(0.1);
}

