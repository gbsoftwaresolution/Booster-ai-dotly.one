import http from 'k6/http'
import { check, sleep } from 'k6'
import { BASE_URL, TEST_USERNAME, thresholds } from './config.js'

function forwardedFor() {
  return `203.0.${(__VU % 200) + 1}.${(__ITER % 200) + 1}`
}

function params() {
  return {
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': forwardedFor(),
    },
  }
}

export const options = {
  stages: [
    { duration: '20s', target: 10 },
    { duration: '30s', target: 30 },
    { duration: '20s', target: 60 },
    { duration: '10s', target: 0 },
  ],
  thresholds,
}

export default function () {
  const leadRes = http.post(
    `${BASE_URL}/lead/create`,
    JSON.stringify({ username: TEST_USERNAME, source: 'load-test' }),
    {
      ...params(),
      responseCallback: http.expectedStatuses(200, 201),
    },
  )

  check(leadRes, {
    'lead created for booking': (r) => r.status === 200 || r.status === 201,
  })

  if (leadRes.status !== 200 && leadRes.status !== 201) {
    sleep(1)
    return
  }

  const leadId = JSON.parse(leadRes.body).leadId
  const slotRes = http.post(
    `${BASE_URL}/booking/create`,
    JSON.stringify({ username: TEST_USERNAME, leadId, slot: '2026-04-20 10:00' }),
    {
      ...params(),
      responseCallback: http.expectedStatuses(200, 201, 409),
    },
  )

  check(slotRes, {
    'booking endpoint responds': (r) => [200, 201, 409].includes(r.status),
  })
  sleep(1)
}
