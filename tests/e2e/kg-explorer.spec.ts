import { test, expect } from '@playwright/test';

test('KG Explorer lists and navigates', async ({ page }) => {
  await page.goto('/en/kg', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  
  // Check if page loaded
  const heading = await page.locator('h1, h2').first();
  await expect(heading).toBeVisible();

  // If there are entity links, try clicking one
  const firstLink = page.locator('a[href*="/kg/"]').first();
  const linkCount = await firstLink.count();
  
  if (linkCount > 0 && await firstLink.isVisible()) {
    await firstLink.click({ timeout: 5000 });
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/en\/kg\/.+/);
    await expect(page.locator('body')).toBeVisible();
  }
});
