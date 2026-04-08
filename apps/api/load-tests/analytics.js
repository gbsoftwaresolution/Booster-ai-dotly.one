import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, TEST_HANDLE, thresholds } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds,
};

export default function () {
  const res = http.post(
    `${BASE_URL}/public/cards/${TEST_HANDLE}/view`,
    JSON.stringify({
      source: 'load-test',
      deviceType: 'desktop',
      referrer: 'https://google.com',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  sleep(0.5);
}
