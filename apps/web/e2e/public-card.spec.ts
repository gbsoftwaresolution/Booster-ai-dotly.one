import { test, expect } from '@playwright/test';

test.describe('Public Card Page', () => {
  // Uses the seeded test-user card (handle: test-user)
  test('public card page loads', async ({ page }) => {
    await page.goto('/card/test-user');
    // Should show card content or a card-shaped container
    await expect(page.locator('body')).toBeVisible();
    // Should not redirect to auth
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test('has correct meta tags', async ({ page }) => {
    await page.goto('/card/test-user');
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
  });

  test('404 for unknown handle', async ({ page }) => {
    const response = await page.goto('/card/this-handle-does-not-exist-xyz123');
    expect(response?.status()).toBe(404);
  });
});
