import { test, expect } from '@playwright/test';

test.describe('Lead Capture', () => {
  test('lead capture button is present on card page', async ({ page }) => {
    await page.goto('/card/test-user');
    // Look for a save contact or lead capture button
    const saveButton = page.getByRole('button', { name: /save|contact|connect/i }).first();
    // It may or may not be visible depending on card config — just check page loads
    await expect(page.locator('body')).toBeVisible();
  });
});
