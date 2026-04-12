import { test, expect } from '@playwright/test'

test.describe('Web health route', () => {
  test('/api/health responds without redirect', async ({ request }) => {
    const response = await request.get('/api/health')

    expect(response.status()).toBeGreaterThanOrEqual(200)
    expect(response.status()).toBeLessThan(600)
    expect(response.headers()['cache-control']).toContain('no-store')

    const body = await response.json()
    expect(body).toHaveProperty('status')

    if (response.status() === 200) {
      expect(body).toHaveProperty('services')
    } else {
      expect(body).toEqual({ status: 'error', service: 'web-health-proxy' })
    }
  })
})
