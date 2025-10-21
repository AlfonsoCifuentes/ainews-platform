import { test, expect } from '@playwright/test';

test('KG Explorer lists and navigates', async ({ page }) => {
  await page.goto('/en/kg');
  await expect(page.locator('h1')).toHaveText(/Knowledge Graph/i);

  // If there are items, click the first entity link
  const firstLink = page.locator('ul >> li >> a').first();
  if (await firstLink.isVisible()) {
    await firstLink.click();
    await expect(page).toHaveURL(/\/en\/kg\//);
    await expect(page.locator('h1')).toBeVisible();
  }
});
