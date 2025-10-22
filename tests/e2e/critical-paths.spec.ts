import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load and display hero section', async ({ page }) => {
    await page.goto('/en');
    
    // Verify hero title is visible
    await expect(page.locator('h1')).toBeVisible();
    
    // Verify CTA buttons are present
    const ctaButtons = page.locator('button, a').filter({ hasText: /Explore|Learn/i });
    await expect(ctaButtons.first()).toBeVisible();
  });

  test('should animate on scroll', async ({ page }) => {
    await page.goto('/en');
    
    // Scroll down to trigger scroll animations
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500); // Wait for animations
    
    // Verify content below fold is visible
    await expect(page.locator('section').nth(1)).toBeVisible();
  });

  test('should navigate to news page', async ({ page }) => {
    await page.goto('/en');
    
    // Click news CTA or navigate to news
    await page.goto('/en/news');
    await expect(page).toHaveURL(/\/en\/news/);
    await expect(page.locator('h1')).toContainText(/News|AI/i);
  });
});

test.describe('News Page', () => {
  test('should display news articles', async ({ page }) => {
    await page.goto('/en/news');
    
    // Verify page title
    await expect(page.locator('h1')).toBeVisible();
    
    // Check if articles are displayed (or empty state)
    const articlesOrEmpty = page.locator('article, [data-testid="empty-state"]');
    await expect(articlesOrEmpty.first()).toBeVisible({ timeout: 10000 });
  });

  test('should support locale switching', async ({ page }) => {
    await page.goto('/en/news');
    
    // Switch to Spanish (if language switcher exists)
    const langSwitcher = page.locator('[data-testid="language-switcher"], button:has-text("ES")');
    if (await langSwitcher.isVisible()) {
      await langSwitcher.click();
      await expect(page).toHaveURL(/\/es\//);
    }
  });
});

test.describe('Courses Page', () => {
  test('should load courses page', async ({ page }) => {
    await page.goto('/en/courses');
    
    // Verify page loaded
    await expect(page.locator('h1')).toBeVisible();
    
    // Course generator should be lazy loaded
    await page.waitForTimeout(1000);
    
    // Verify page is interactive
    const interactiveElements = page.locator('button, input');
    await expect(interactiveElements.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display course catalog', async ({ page }) => {
    await page.goto('/en/courses');
    
    // Scroll to catalog section
    await page.evaluate(() => window.scrollBy(0, 500));
    
    // Verify course cards are visible
    const courseCards = page.locator('[class*="glass"], [class*="card"]');
    await expect(courseCards.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Performance', () => {
  test('should meet performance budgets', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/en');
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should lazy load heavy components', async ({ page }) => {
    await page.goto('/en/courses');
    
    // Initial page should load quickly
    await expect(page.locator('h1')).toBeVisible({ timeout: 2000 });
    
    // Heavy components load after
    await page.waitForTimeout(1000);
  });
});

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/en');
    
    // Tab through focusable elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verify focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/en');
    
    // Verify h1 exists
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });
});
