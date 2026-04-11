import { test as base, expect } from '@playwright/test'

const authState = process.env.PLAYWRIGHT_PRO_STATE ?? process.env.PLAYWRIGHT_AUTH_STATE
const test = authState ? base.extend({ storageState: authState }) : base

test.describe('Dashboard card links', () => {
  test.skip(!authState, 'PLAYWRIGHT_PRO_STATE or PLAYWRIGHT_AUTH_STATE is not configured')

  test('dashboard card row links to the app editor path', async ({ page }) => {
    await page.route('**/cards', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'card_123',
            handle: 'demo-user',
            templateId: 'MINIMAL',
            isActive: true,
            fields: { name: 'Demo User', title: 'Founder' },
          },
        ]),
      })
    })

    await page.route('**/contacts?limit=5', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ contacts: [], total: 0 }),
      })
    })

    await page.route('**/lead-submissions?limit=5', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ submissions: [], total: 0 }),
      })
    })

    await page.route('**/deals', async (route) => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) })
    })

    await page.route('**/tasks?completed=false', async (route) => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) })
    })

    await page.route('**/crm/analytics/funnel', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ stages: [], totalActive: 0 }),
      })
    })

    await page.route('**/scheduling/appointment-types', async (route) => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) })
    })

    await page.route('**/cards/card_123/analytics/summary', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ totalViews: 12, totalClicks: 4, totalLeads: 2 }),
      })
    })

    await page.goto('/dashboard')

    const editLink = page.locator('a[href="/apps/cards/card_123/edit"]').first()
    await expect(editLink).toBeVisible()
    await expect(editLink).toHaveAttribute('href', '/apps/cards/card_123/edit')
    await expect(page.locator('a[href="/apps/cards"]').first()).toBeVisible()
  })
})
