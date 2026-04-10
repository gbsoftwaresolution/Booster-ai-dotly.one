import { test as base, expect } from '@playwright/test'

const freeState = process.env.PLAYWRIGHT_FREE_STATE
const starterState = process.env.PLAYWRIGHT_STARTER_STATE
const proState = process.env.PLAYWRIGHT_PRO_STATE

const freeTest = freeState ? base.extend({ storageState: freeState }) : base

const starterTest = starterState ? base.extend({ storageState: starterState }) : base

const proTest = proState ? base.extend({ storageState: proState }) : base

freeTest.describe('Plan gates: Free', () => {
  freeTest.skip(!freeState, 'PLAYWRIGHT_FREE_STATE is not configured')

  freeTest('domains page shows Pro gate', async ({ page }) => {
    await page.goto('/settings/domains')
    await expect(page.getByRole('heading', { name: /Custom domains require Pro/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Upgrade to Pro/i })).toBeVisible()
  })

  freeTest('webhooks page shows Pro gate', async ({ page }) => {
    await page.goto('/settings/webhooks')
    await expect(page.getByRole('heading', { name: /Webhooks require Pro/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Upgrade to Pro/i })).toBeVisible()
  })

  freeTest('team page shows future-plan gate', async ({ page }) => {
    await page.goto('/team')
    await expect(
      page.getByRole('heading', { name: /Team management is not published yet/i }),
    ).toBeVisible()
  })
})

starterTest.describe('Plan gates: Starter', () => {
  starterTest.skip(!starterState, 'PLAYWRIGHT_STARTER_STATE is not configured')

  starterTest('domains page remains gated on Starter', async ({ page }) => {
    await page.goto('/settings/domains')
    await expect(page.getByRole('heading', { name: /Custom domains require Pro/i })).toBeVisible()
  })

  starterTest('webhooks page remains gated on Starter', async ({ page }) => {
    await page.goto('/settings/webhooks')
    await expect(page.getByRole('heading', { name: /Webhooks require Pro/i })).toBeVisible()
  })
})

proTest.describe('Plan gates: Pro', () => {
  proTest.skip(!proState, 'PLAYWRIGHT_PRO_STATE is not configured')

  proTest('domains page is accessible on Pro', async ({ page }) => {
    await page.goto('/settings/domains')
    await expect(page.getByRole('heading', { name: /Custom Domains/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Custom domains require Pro/i })).toHaveCount(0)
  })

  proTest('webhooks page is accessible on Pro', async ({ page }) => {
    await page.goto('/settings/webhooks')
    await expect(page.getByRole('heading', { name: /Webhooks/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Webhooks require Pro/i })).toHaveCount(0)
  })
})
