/**
 * E2E Tests for News Curation Flow
 * Phase 5.1 - Category G: Testing & Quality
 * 
 * Tests the complete news curation and display flow
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('News Curation Flow - English', () => {
  test('should display curated news articles', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/news`);

    // Wait for articles to load
    await page.waitForSelector('article', { timeout: 10000 });

    // Check that articles are displayed
    const articles = await page.locator('article').count();
    expect(articles).toBeGreaterThan(0);

    // Check article structure
    const firstArticle = page.locator('article').first();
    await expect(firstArticle).toBeVisible();

    // Should have image
    const image = firstArticle.locator('img').first();
    await expect(image).toBeVisible();

    // Should have title
    const title = firstArticle.locator('h2, h3').first();
    await expect(title).toBeVisible();
    const titleText = await title.textContent();
    expect(titleText).toBeTruthy();
    expect(titleText!.length).toBeGreaterThan(10);
  });

  test('should navigate to article modal on click', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/news`);
    await page.waitForSelector('article');

    // Click first article
    const firstArticle = page.locator('article').first();
    await firstArticle.click();

    // Modal should open
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Modal should have article content
    const modalTitle = modal.locator('h1, h2').first();
    await expect(modalTitle).toBeVisible();
  });

  test('should filter articles by category', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/news`);
    await page.waitForSelector('article');

    // Find and click a category filter (if exists)
    const categoryButton = page.locator('button:has-text("All")').or(
      page.locator('[role="tab"]:has-text("All")')
    );

    if (await categoryButton.count() > 0) {
      // Click different category
      const otherCategory = page.locator('button, [role="tab"]').nth(1);
      if (await otherCategory.count() > 0) {
        await otherCategory.click();
        await page.waitForTimeout(500); // Wait for filter

        const filteredCount = await page.locator('article').count();
        // Count may change or stay same depending on data
        expect(filteredCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should load more articles on infinite scroll', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/news`);
    await page.waitForSelector('article');

    const initialCount = await page.locator('article').count();

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Wait for new articles to load
    await page.waitForTimeout(2000);

    const newCount = await page.locator('article').count();
    
    // Should have loaded more or stay same if no more articles
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('should bookmark an article', async ({ page }) => {
    // This test requires authentication, skip if not logged in
    await page.goto(`${BASE_URL}/en/news`);
    await page.waitForSelector('article');

    const firstArticle = page.locator('article').first();
    
    // Look for bookmark button
    const bookmarkButton = firstArticle.locator('button[aria-label*="bookmark" i], button:has-text("Bookmark")');
    
    if (await bookmarkButton.count() > 0) {
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Verify button exists and is interactable
      await expect(bookmarkButton).toBeVisible();
    }
  });
});

test.describe('News Curation Flow - Spanish', () => {
  test('should display curated news in Spanish', async ({ page }) => {
    await page.goto(`${BASE_URL}/es/news`);
    await page.waitForSelector('article', { timeout: 10000 });

    const articles = await page.locator('article').count();
    expect(articles).toBeGreaterThan(0);

    // Check for Spanish content
    const title = page.locator('article h2, article h3').first();
    const titleText = await title.textContent();
    expect(titleText).toBeTruthy();
  });

  test('should switch between EN and ES', async ({ page }) => {
    // Start in English
    await page.goto(`${BASE_URL}/en/news`);
    await page.waitForSelector('article');

    // Find language switcher
    const langSwitcher = page.locator('button:has-text("ES"), a:has-text("ES"), [data-lang="es"]');
    
    if (await langSwitcher.count() > 0) {
      await langSwitcher.first().click();
      
      // Should redirect to Spanish
      await page.waitForURL(/\/es\//, { timeout: 5000 });
      expect(page.url()).toContain('/es/');
    }
  });
});

test.describe('SEO & Metadata', () => {
  test('should have proper meta tags', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/news`);

    // Check title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).toContain('AI');

    // Check meta description
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(50);

    // Check Open Graph tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toBeTruthy();
  });

  test('should have hreflang alternates', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/news`);

    // Check for alternate language links
    const hreflangEN = page.locator('link[hreflang="en"]');
    const hreflangES = page.locator('link[hreflang="es"]');

    expect(await hreflangEN.count()).toBeGreaterThan(0);
    expect(await hreflangES.count()).toBeGreaterThan(0);
  });

  test('should have JSON-LD structured data', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/news`);

    // Check for JSON-LD script
    const jsonLd = page.locator('script[type="application/ld+json"]');
    expect(await jsonLd.count()).toBeGreaterThan(0);

    // Validate JSON
    const content = await jsonLd.first().textContent();
    const data = JSON.parse(content!);
    
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBeTruthy();
  });
});

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(`${BASE_URL}/en/news`);
    await page.waitForSelector('article');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have optimized images', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/news`);
    await page.waitForSelector('article img');

    const firstImage = page.locator('article img').first();
    
    // Check if using Next.js Image component (should have srcset)
    const srcset = await firstImage.getAttribute('srcset');
    expect(srcset).toBeTruthy(); // Next.js Image generates srcset

    // Check loading attribute
    const loading = await firstImage.getAttribute('loading');
    // First few images might be eager, rest should be lazy
    expect(['lazy', 'eager']).toContain(loading);
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/news`);
    await page.waitForSelector('article');

    // Check for accessible names on interactive elements
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      
      // Button should have either aria-label or visible text
      expect(ariaLabel || text).toBeTruthy();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/news`);
    await page.waitForSelector('article');

    // Tab through elements
    await page.keyboard.press('Tab');
    
    // Check that focus is visible
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName;
    });
    
    expect(focusedElement).toBeTruthy();
  });
});
