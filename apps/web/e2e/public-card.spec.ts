import { test, expect } from '@playwright/test'

test.describe('Public Card Page', () => {
  // Uses the seeded test-user card (handle: test-user)
  test('public card page loads', async ({ page }) => {
    await page.goto('/card/test-user')
    // Should show card content or a card-shaped container
    await expect(page.locator('body')).toBeVisible()
    // Should not redirect to auth
    await expect(page).not.toHaveURL(/sign-in/)
  })

  test('has correct meta tags', async ({ page }) => {
    await page.goto('/card/test-user')
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
    expect(ogTitle).toBeTruthy()
  })

  test('404 for unknown handle', async ({ page }) => {
    const response = await page.goto('/card/this-handle-does-not-exist-xyz123')
    expect(response?.status()).toBe(404)
  })

  test('shows booking CTA only when public card includes a bookable appointment', async ({
    page,
  }) => {
    await page.route('**/public/cards/test-user', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'card_1',
          handle: 'test-user',
          templateId: 'MINIMAL',
          fields: {
            name: 'Test User',
            title: 'Founder',
            company: 'Dotly',
            phone: '',
            whatsapp: '',
            email: '',
            website: '',
            bio: '',
            address: '',
            mapUrl: '',
            avatarUrl: '',
            logoUrl: '',
          },
          isActive: true,
          socialLinks: [],
          mediaBlocks: [],
          theme: {
            primaryColor: '#0ea5e9',
            secondaryColor: '#ffffff',
            fontFamily: 'Inter',
          },
          bookableAppointment: {
            slug: 'intro-call',
            name: 'Intro Call',
            durationMins: 30,
          },
        }),
      })
    })

    await page.goto('/card/test-user')
    await expect(page.getByRole('link', { name: /book a meeting/i })).toHaveAttribute(
      'href',
      /\/book\/test-user\/intro-call$/,
    )
  })
})
