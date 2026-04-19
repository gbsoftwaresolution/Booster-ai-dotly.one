import http from 'k6/http'
import { check, sleep } from 'k6'
import { BASE_URL, TEST_USERNAME, thresholds } from './config.js'

function forwardedFor() {
  return `198.51.${(__VU % 200) + 1}.${(__ITER % 200) + 1}`
}

export const options = {
  stages: [
    { duration: '20s', target: 20 },
    { duration: '40s', target: 80 },
    { duration: '20s', target: 120 },
    { duration: '20s', target: 0 },
  ],
  thresholds,
}

export default function () {
  const res = http.get(`${BASE_URL}/public-page/${TEST_USERNAME}`, {
    headers: { 'X-Forwarded-For': forwardedFor() },
  })
  const ok = res.status === 200
  check(res, {
    'public sales link status is 200': () => ok,
    'public sales link p95 under target': (r) => r.timings.duration < 500,
    'contains profile payload': () =>
      ok && JSON.parse(res.body).profile?.username === TEST_USERNAME,
  })
  sleep(1)
}
