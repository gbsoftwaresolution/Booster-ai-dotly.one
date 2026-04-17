import { test, expect } from '@playwright/test'

test.describe('Sales Link page', () => {
  test('renders the seeded sales profile and primary CTAs', async ({ page }) => {
    await page.goto('/link/testuser')

    await expect(page.getByRole('heading', { name: 'Test User' })).toBeVisible()
    await expect(
      page.getByText('I help businesses grow with fast, conversion-first sales links.'),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Chat on WhatsApp' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Book Call' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pay Now' })).toBeVisible()
  })
})
