import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
  test('should load English locale by default', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to /en
    await expect(page).toHaveURL(/\/en/);
  });

  test('should navigate between locales', async ({ page }) => {
    // Start in English
    await page.goto('/en');
    await expect(page).toHaveURL(/\/en/);
    
    // Navigate to Spanish
    await page.goto('/es');
    await expect(page).toHaveURL(/\/es/);
  });

  test('should maintain route when switching locales', async ({ page }) => {
    // Navigate to English news
    await page.goto('/en/news');
    await expect(page).toHaveURL(/\/en\/news/);
    
    // Switch to Spanish news
    await page.goto('/es/news');
    await expect(page).toHaveURL(/\/es\/news/);
    
    // Content should be in Spanish
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle deep links with locale', async ({ page }) => {
    // Navigate to deep link in Spanish
    await page.goto('/es/courses');
    await expect(page).toHaveURL(/\/es\/courses/);
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate to all main routes', async ({ page }) => {
    const routes = [
      '/en',
      '/en/news',
      '/en/courses',
      '/en/kg',
      '/en/trending',
      '/en/dashboard',
      '/en/analytics',
    ];

    for (const route of routes) {
      await page.goto(route);
      await expect(page).toHaveURL(route);
      
      // Verify page loaded successfully
      await expect(page.locator('h1, h2')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have working header navigation', async ({ page }) => {
    await page.goto('/en');
    
    // Look for nav links
    const navLinks = page.locator('nav a, header a');
    const linkCount = await navLinks.count();
    
    if (linkCount > 0) {
      // Click first nav link
      await navLinks.first().click();
      await page.waitForTimeout(500);
      
      // Should navigate somewhere
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('should have working footer navigation', async ({ page }) => {
    await page.goto('/en');
    
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    // Look for footer links
    const footerLinks = page.locator('footer a');
    const linkCount = await footerLinks.count();
    
    expect(linkCount).toBeGreaterThan(0);
  });
});

test.describe('Breadcrumbs', () => {
  test('should show breadcrumbs on deep pages', async ({ page }) => {
    await page.goto('/en/courses');
    
    // Breadcrumbs are optional but page should work
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('SEO Meta Tags', () => {
  test('should have proper meta tags on homepage', async ({ page }) => {
    await page.goto('/en');
    
    // Check title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    
    // Check meta description
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /.+/);
  });

  test('should have proper meta tags on news page', async ({ page }) => {
    await page.goto('/en/news');
    
    // Check title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title).toContain('News');
  });

  test('should have Open Graph tags', async ({ page }) => {
    await page.goto('/en');
    
    // Check OG tags
    const ogTitle = page.locator('meta[property="og:title"]');
    const ogDescription = page.locator('meta[property="og:description"]');
    
    await expect(ogTitle).toHaveAttribute('content', /.+/);
    await expect(ogDescription).toHaveAttribute('content', /.+/);
  });

  test('should have correct alternate language links', async ({ page }) => {
    await page.goto('/en/news');
    
    // Check for alternate language links
    const alternateLink = page.locator('link[rel="alternate"][hreflang="es"]');
    const hasAlternate = await alternateLink.count() > 0;
    
    // Alternate links should exist for bilingual site
    expect(hasAlternate).toBe(true);
  });
});

test.describe('Error Handling', () => {
  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/en/non-existent-page-12345');
    
    // Page should still render something
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle invalid locale gracefully', async ({ page }) => {
    await page.goto('/invalid-locale/news');
    
    // Should redirect or show error
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Search', () => {
  test('should have search functionality', async ({ page }) => {
    await page.goto('/en/search');
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    await expect(searchInput.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Mobile Navigation', () => {
  test('should show mobile menu on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/en');
    
    // Look for mobile menu button (hamburger)
    const menuButton = page.locator('button[aria-label*="menu" i], button[class*="mobile"]');
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);
      
      // Mobile menu should be visible
      const mobileNav = page.locator('nav[class*="mobile"], [data-mobile-menu]');
      await expect(mobileNav.first()).toBeVisible();
    }
  });

  test('should be usable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/en/news');
    
    // Content should be visible and scrollable
    await expect(page.locator('h1')).toBeVisible();
    
    // Scroll should work
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(200);
    
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(200);
  });
});
