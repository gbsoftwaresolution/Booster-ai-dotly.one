import { test, expect } from '@playwright/test'

test.describe('Public scheduling flows', () => {
  test('booking flow reaches confirmation with stubbed public API', async ({ page }) => {
    const bookingPath = '/book/demo-user/intro-call'

    await page.route('**/public/analytics', async (route) => {
      await route.fulfill({ status: 204, body: '' })
    })

    await page.route('**/scheduling/public/demo-user/intro-call', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'apt_1',
          cardId: 'card_1',
          cardHandle: 'demo-user',
          name: 'Intro Call',
          description: 'A quick intro call',
          durationMins: 30,
          color: '#0ea5e9',
          location: 'Google Meet',
          timezone: 'UTC',
          owner: { name: 'Demo Owner', avatarUrl: null },
          questions: [],
        }),
      })
    })

    await page.route('**/scheduling/public/demo-user/intro-call/slots**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          slots: ['2099-04-15T10:00:00.000Z'],
          ownerTimezone: 'UTC',
        }),
      })
    })

    await page.route('**/scheduling/public/demo-user/intro-call/book', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ id: 'booking_1', startAt: '2099-04-15T10:00:00.000Z' }),
      })
    })

    await page.goto(bookingPath)
    await page.getByRole('button', { name: /^15$/ }).click()
    await page.getByRole('button', { name: /3:30\s*(PM|pm)?/ }).click()
    await page.getByRole('button', { name: /next:\s*your details/i }).click()

    await page.getByRole('textbox', { name: /your full name/i }).fill('Guest User')
    await page.getByRole('textbox', { name: /you@example.com/i }).fill('guest@example.com')
    await page.getByRole('button', { name: /confirm booking/i }).click()

    await expect(page.getByRole('heading', { name: /you'?re booked/i })).toBeVisible()
    await expect(page.getByText(/guest@example.com/i)).toBeVisible()
  })

  test('reschedule flow reaches confirmation with stubbed public API', async ({ page }) => {
    const token = 'token_123'

    await page.route(`**/scheduling/bookings/${token}/info`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'booking_1',
          startAt: '2099-04-14T09:00:00.000Z',
          endAt: '2099-04-14T09:30:00.000Z',
          guestName: 'Guest User',
          guestEmail: 'guest@example.com',
          token,
          status: 'CONFIRMED',
          appointmentType: {
            id: 'apt_1',
            name: 'Intro Call',
            durationMins: 30,
            color: '#0ea5e9',
            location: 'Google Meet',
            timezone: 'UTC',
          },
        }),
      })
    })

    await page.route(`**/scheduling/bookings/${token}/slots**`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          slots: ['2099-04-15T11:00:00.000Z'],
          ownerTimezone: 'UTC',
        }),
      })
    })

    await page.route(`**/scheduling/bookings/${token}/reschedule`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await page.goto(`/book/reschedule/${token}`)
    await page.getByRole('button', { name: /^15$/ }).click()
    await page.getByRole('button', { name: /4:30\s*(PM|pm)?/ }).click()
    await page.getByRole('button', { name: /confirm/i }).click()

    await expect(page.getByRole('heading', { name: /booking rescheduled/i })).toBeVisible()
  })
})
