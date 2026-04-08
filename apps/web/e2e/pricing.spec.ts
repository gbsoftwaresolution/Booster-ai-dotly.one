import { test, expect } from '@playwright/test';

test.describe('Pricing Page', () => {
  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: /pricing|plans/i })).toBeVisible();
  });

  test('shows plan tiers', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText(/free/i).first()).toBeVisible();
    await expect(page.getByText(/pro/i).first()).toBeVisible();
  });
});
