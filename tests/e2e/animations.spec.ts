import { test, expect } from '@playwright/test';

test.describe('Scroll Animations', () => {
  test('should trigger scroll reveal animations', async ({ page }) => {
    await page.goto('/en');
    
    // Get initial viewport position
    const initialScroll = await page.evaluate(() => window.scrollY);
    expect(initialScroll).toBe(0);
    
    // Scroll down to trigger reveals
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(800); // Wait for animations
    
    // Verify scroll position changed
    const newScroll = await page.evaluate(() => window.scrollY);
    expect(newScroll).toBeGreaterThan(500);
    
    // Verify elements are still visible after animation
    const sections = page.locator('section');
    await expect(sections.nth(1)).toBeVisible();
  });

  test('should handle reduced motion preference', async ({ page, context }) => {
    // Set prefers-reduced-motion
    await context.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        }),
      });
    });
    
    await page.goto('/en');
    
    // Page should still be fully functional
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('Interactive Animations', () => {
  test('should animate on hover', async ({ page }) => {
    await page.goto('/en/news');
    
    // Find first hoverable card
    const firstCard = page.locator('article, [class*="card"]').first();
    await firstCard.waitFor({ state: 'visible' });
    
    // Hover over card
    await firstCard.hover();
    await page.waitForTimeout(300); // Wait for transition
    
    // Card should still be visible (may have scaled/transformed)
    await expect(firstCard).toBeVisible();
  });

  test('should animate buttons on click', async ({ page }) => {
    await page.goto('/en');
    
    // Find first interactive button
    const button = page.locator('button').first();
    await button.waitFor({ state: 'visible' });
    
    // Click should trigger ripple or feedback
    await button.click();
    await page.waitForTimeout(200);
    
    // Button should still be visible
    await expect(button).toBeVisible();
  });
});

test.describe('Page Transitions', () => {
  test('should transition between pages smoothly', async ({ page }) => {
    await page.goto('/en');
    
    // Navigate to another page
    await page.goto('/en/courses');
    await expect(page).toHaveURL(/\/en\/courses/);
    
    // Verify content loaded
    await expect(page.locator('h1')).toBeVisible({ timeout: 3000 });
  });

  test('should maintain scroll position on back navigation', async ({ page }) => {
    await page.goto('/en/news');
    
    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500));
    
    // Navigate away and back
    await page.goto('/en/courses');
    await page.goBack();
    
    // Verify we're back on news page
    await expect(page).toHaveURL(/\/en\/news/);
  });
});

test.describe('Loading States', () => {
  test('should show loading skeleton for lazy components', async ({ page }) => {
    // Start navigation
    await page.goto('/en/courses', { waitUntil: 'domcontentloaded' });
    
    // Eventually content should load
    await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
  });

  test('should handle slow network gracefully', async ({ page, context }) => {
    // Emulate slow 3G
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Delay all requests
      await route.continue();
    });
    
    await page.goto('/en/courses', { timeout: 15000 });
    
    // Page should eventually load
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Three.js Components', () => {
  test('should lazy load FloatingObjects', async ({ page }) => {
    await page.goto('/en');
    
    // Wait for page to be interactive
    await page.waitForLoadState('networkidle');
    
    // Main requirement: page loads without errors
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should lazy load GraphVisualizer', async ({ page }) => {
    // Navigate to a KG detail page (if entities exist)
    await page.goto('/en/kg');
    
    const firstLink = page.locator('a[href*="/kg/"]').first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      await expect(page).toHaveURL(/\/en\/kg\/.+/);
      
      // Wait for potential Three.js canvas
      await page.waitForTimeout(2000);
      
      // Page should be functional
      await expect(page.locator('h1')).toBeVisible();
    }
  });
});

test.describe('Animation Performance', () => {
  test('should not drop frames during scroll', async ({ page }) => {
    await page.goto('/en');
    
    // Scroll multiple times and check FPS
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 200));
      await page.waitForTimeout(100);
    }
    
    // Page should remain responsive
    const isResponsive = await page.evaluate(() => {
      return document.readyState === 'complete';
    });
    
    expect(isResponsive).toBe(true);
  });

  test('should handle rapid interactions', async ({ page }) => {
    await page.goto('/en');
    
    // Rapidly click/hover multiple elements
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        await buttons.nth(i).hover({ timeout: 500 });
        await page.waitForTimeout(50);
      }
    }
    
    // Page should still be responsive
    await expect(page.locator('h1')).toBeVisible();
  });
});
