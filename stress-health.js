import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // ramp to 20 VUs
    { duration: '1m', target: 50 },  // hold 50 VUs
    { duration: '30s', target: 0 },  // ramp down
  ],
};

export default function () {
  const url = 'http://127.0.0.1:5005/campusflow-f798c/asia-south1/healthCheck';
  const payload = JSON.stringify({ data: {} });

  const res = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body contains ok': (r) => (r.body || '').includes('"status":"ok"'),
  });

  // Small pacing so we generate reasonable traffic.
  sleep(0.2);
}

