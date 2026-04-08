import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, TEST_HANDLE, thresholds } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up
    { duration: '1m', target: 50 },    // Sustained load
    { duration: '30s', target: 100 },  // Peak
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds,
};

export default function () {
  const res = http.get(`${BASE_URL}/public/cards/${TEST_HANDLE}`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has handle': (r) => JSON.parse(r.body).handle === TEST_HANDLE,
  });
  sleep(1);
}
