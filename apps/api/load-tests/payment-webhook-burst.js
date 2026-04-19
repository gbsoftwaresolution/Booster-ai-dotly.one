import http from 'k6/http'
import { check } from 'k6'
import { BASE_URL, thresholds } from './config.js'

function forwardedFor() {
  return `192.0.2.${((__VU + __ITER) % 200) + 1}`
}

export const options = {
  stages: [
    { duration: '10s', target: 25 },
    { duration: '20s', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    ...thresholds,
    http_req_duration: ['p(95)<750'],
  },
}

export default function () {
  const res = http.post(`${BASE_URL}/payment/webhook`, JSON.stringify({ burst: true }), {
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': forwardedFor(),
    },
    responseCallback: http.expectedStatuses(200, 201, 400, 404, 429),
  })

  check(res, {
    'webhook burst endpoint responds': (r) => [200, 201, 400, 404, 429].includes(r.status),
  })
}
