import { test, expect } from '@playwright/test';

test.describe('Email Signature Generator', () => {
  test('redirects unauthenticated user', async ({ page }) => {
    await page.goto('/email-signature');
    await expect(page).toHaveURL(/sign-in|auth/);
  });
});
