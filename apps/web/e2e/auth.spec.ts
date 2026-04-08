import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('sign-in page loads', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('sign-up page loads', async ({ page }) => {
    await page.goto('/auth/sign-up');
    await expect(page.getByRole('heading', { name: /sign up|create account/i })).toBeVisible();
  });

  test('redirects unauthenticated user from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/sign-in/);
  });

  test('shows validation error for empty form', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Should not navigate away (form validation)
    await expect(page).toHaveURL(/sign-in/);
  });
});
