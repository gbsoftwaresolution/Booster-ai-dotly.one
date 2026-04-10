import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('auth page loads and preserves next path', async ({ page }) => {
    await page.goto('/auth?next=%2Fsettings%2Fbilling%3Fplan%3DPRO%26duration%3DMONTHLY')
    await expect(page.getByRole('heading', { name: /dotly.one/i })).toBeVisible()
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
  })

  test('redirects unauthenticated user from dashboard into auth with next param', async ({
    page,
  }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\?next=%2Fdashboard/)
  })

  test('redirects unauthenticated billing access into auth with full next param', async ({
    page,
  }) => {
    await page.goto('/settings/billing?plan=PRO&duration=ANNUAL')
    await expect(page).toHaveURL(/\/auth\?next=/)
    await expect(page).toHaveURL(/settings%2Fbilling%3Fplan%3DPRO%26duration%3DANNUAL/)
  })

  test('auth callback rejects invalid redirect targets', async ({ page }) => {
    const response = await page.goto(
      '/auth/callback?code=00000000-0000-4000-8000-000000000000&next=https://evil.example',
    )
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(/\/auth(\?|$)/)
  })

  test('auth callback rejects invalid code format', async ({ page }) => {
    const response = await page.goto('/auth/callback?code=not-a-valid-code&next=%2Fsettings')
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(/error=invalid_code/)
  })
})
