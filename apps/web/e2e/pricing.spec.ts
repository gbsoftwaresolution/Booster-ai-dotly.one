import { test, expect } from '@playwright/test'

test.describe('Pricing Page', () => {
  test('pricing page loads and shows published plans only', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByRole('heading', { name: /pricing|simple pricing/i })).toBeVisible()
    await expect(page.getByText(/^Free$/).first()).toBeVisible()
    await expect(page.getByText(/^Starter$/).first()).toBeVisible()
    await expect(page.getByText(/^Pro$/).first()).toBeVisible()
    await expect(
      page.getByText(/Business, Agency, and Enterprise plans will be published later/i),
    ).toBeVisible()
  })

  test('starter CTA preserves plan and duration in auth handoff', async ({ page }) => {
    await page.goto('/pricing')
    await page.getByRole('button', { name: 'Annual' }).click()
    await page.getByRole('link', { name: /Start with Starter/i }).click()
    await expect(page).toHaveURL(/\/auth\?next=/)
    await expect(page).toHaveURL(/plan%3DSTARTER/)
    await expect(page).toHaveURL(/duration%3DANNUAL/)
  })

  test('pro CTA preserves plan and duration in auth handoff', async ({ page }) => {
    await page.goto('/pricing')
    await page.getByRole('button', { name: '6 Months' }).click()
    await page.getByRole('link', { name: /Upgrade to Pro/i }).click()
    await expect(page).toHaveURL(/\/auth\?next=/)
    await expect(page).toHaveURL(/plan%3DPRO/)
    await expect(page).toHaveURL(/duration%3DSIX_MONTHS/)
  })
})
