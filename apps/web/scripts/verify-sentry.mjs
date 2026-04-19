const baseUrl = (process.env.WEB_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')

const response = await fetch(`${baseUrl}/api/ops/sentry-test`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
  },
})

const body = await response.text()

if (!response.ok) {
  throw new Error(`Sentry smoke test failed with ${response.status}: ${body}`)
}

console.log(`Sentry smoke test request accepted by ${baseUrl}`)
