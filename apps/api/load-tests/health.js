import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, thresholds } from './config.js';

export const options = {
  stages: [
    { duration: '10s', target: 200 },  // Spike
    { duration: '30s', target: 200 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'],
    http_req_failed: ['rate<0.001'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  check(res, { 'status is 200': (r) => r.status === 200 });
}
