import { test as base, expect } from '@playwright/test'

const proState = process.env.PLAYWRIGHT_PRO_STATE
const freeState = process.env.PLAYWRIGHT_FREE_STATE

base.describe('Core money path', () => {
  base.use({ storageState: proState })
  base.skip(!proState, 'PLAYWRIGHT_PRO_STATE is not configured')

  base(
    'public lead -> whatsapp -> booking -> payment shows up in owner funnel',
    async ({ page, context }) => {
      await page.goto('/link/prouser')

      await expect(page.getByRole('heading', { name: 'Pro User' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Book Call' })).toBeVisible()
      const paymentButton = page.getByRole('button', { name: 'Confirm Order' })
      await expect(paymentButton).toBeVisible()

      await page
        .getByRole('button', { name: /chat now|get help on whatsapp|message me instantly/i })
        .click()

      await page.getByRole('button', { name: 'Book Call' }).click()
      const firstAvailableSlot = page
        .getByRole('button', { name: /2026-04-20 (10:00|12:00|15:00)/ })
        .first()
      await expect(firstAvailableSlot).toBeVisible()
      await firstAvailableSlot.click()

      await paymentButton.click()
      await expect(page).toHaveURL(/\/success\?mode=cod(?:&|$)/)
      await expect(page.getByRole('heading', { name: 'Thank you' })).toBeVisible()
      await expect(page.getByText('Your cash on delivery request has been sent.')).toBeVisible()
      const leadId = new URL(page.url()).searchParams.get('leadId')
      expect(leadId).toBeTruthy()

      const ownerPage = await context.newPage()
      await ownerPage.goto('/dashboard')
      await expect(ownerPage.getByText(/you earned/i)).toBeVisible()

      await ownerPage.goto('/sales-leads')
      const leadCard = ownerPage.locator(`a[href="/sales-leads/${leadId}"]`).first()
      await expect(leadCard).toBeVisible()
      await leadCard.click()

      await expect(ownerPage.getByRole('heading', { name: 'Lead Timeline' })).toBeVisible()
      await expect(ownerPage.getByText('whatsapp', { exact: true })).toBeVisible()
      await expect(ownerPage.getByText('payment', { exact: true })).toBeVisible()
      await expect(ownerPage.getByText('pending_collection', { exact: true })).toBeVisible()
    },
  )

  base('public sales link loads for a paid seller with all money-path CTAs', async ({ page }) => {
    await page.goto('/link/prouser')

    await expect(page.getByRole('heading', { name: 'Pro User' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /chat now|get help on whatsapp|message me instantly/i }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ask About Services' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Book Call' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirm Order' })).toBeVisible()
  })

  base('paid seller payment CTA uses the seeded COD runtime path', async ({ page }) => {
    await page.goto('/link/pronopayments')

    const paymentButton = page.getByRole('button', { name: 'Confirm Order' })
    await expect(paymentButton).toBeVisible()
    await expect(page.getByText(/Payments powered by cash on_delivery in US\./i)).toBeVisible()
  })
})

base.describe('Core money path negative states', () => {
  base.use({ storageState: freeState })
  base.skip(!freeState, 'PLAYWRIGHT_FREE_STATE is not configured')

  base('upgrade flow surfaces cancelled checkout state', async ({ page }) => {
    await page.goto('/upgrade?checkout=cancelled')
    await expect(page.getByText('Upgrade to Pro')).toBeVisible()
    await expect(page.getByText('Upgrade checkout was cancelled.')).toBeVisible()
  })

  base('free sales link shows payment upgrade message and plan limit hit', async ({ page }) => {
    await page.goto('/link/testuser')

    await expect(page.getByRole('button', { name: 'Upgrade to Accept Payments' })).toBeVisible()
    await expect(
      page.getByText('Payments unlock when this seller upgrades to Pro.').first(),
    ).toBeVisible()

    await expect(
      page.getByText('This user has reached their free limit right now.').first(),
    ).toBeVisible()
  })

  base('expired session redirects upgrade flow back to auth', async ({ page, context }) => {
    await context.clearCookies()

    await page.goto('/upgrade')
    await expect(page).toHaveURL(/\/auth\?next=%2Fupgrade$/)
  })
})
