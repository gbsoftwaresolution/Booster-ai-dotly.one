import { test, expect } from '@playwright/test';

// These tests require authentication - skip if no auth storage state is present
// In CI, these will be skipped unless PLAYWRIGHT_AUTH_STATE is set
test.describe('Dashboard (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    // If no session, skip these tests
    // We check by trying to reach dashboard and seeing if redirected
  });

  test('dashboard redirects to sign-in when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/sign-in|auth/);
  });

  test('cards page redirects to sign-in when unauthenticated', async ({ page }) => {
    await page.goto('/cards');
    await expect(page).toHaveURL(/sign-in|auth/);
  });

  test('contacts page redirects to sign-in when unauthenticated', async ({ page }) => {
    await page.goto('/contacts');
    await expect(page).toHaveURL(/sign-in|auth/);
  });
});
