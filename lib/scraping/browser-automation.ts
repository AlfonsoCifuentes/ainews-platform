/**
 * Browser Automation for JS-Heavy Sites
 * 
 * Uses Playwright to scrape sites that require JavaScript execution.
 * Falls back to regular fetch if browser automation is not available.
 * 
 * IMPORTANT: This is an OPTIONAL feature. Install Playwright only if needed:
 * npm install playwright
 * npx playwright install chromium --with-deps
 */

import type { Browser, Page } from 'playwright';

interface BrowserAutomationOptions {
  timeout?: number;
  waitForSelector?: string;
  waitForNetworkIdle?: boolean;
  screenshot?: boolean;
  userAgent?: string;
  viewport?: { width: number; height: number };
}

interface ScrapedContent {
  html: string;
  text: string;
  title: string;
  screenshot?: Buffer;
  finalUrl: string;
  loadTime: number;
}

let browserInstance: Browser | null = null;

/**
 * Initialize browser instance (lazy loading)
 */
async function getBrowser(): Promise<Browser | null> {
  if (browserInstance) {
    return browserInstance;
  }

  try {
    // Dynamic import - only load if Playwright is installed
    const { chromium } = await import('playwright');
    
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
      ],
    });

    // Cleanup on process exit
    process.on('exit', async () => {
      if (browserInstance) {
        await browserInstance.close();
      }
    });

    return browserInstance;
  } catch (error) {
    console.warn('[BrowserAutomation] Playwright not installed. Skipping browser automation.', error);
    return null;
  }
}

/**
 * Scrape content from a URL using browser automation
 * 
 * @example
 * const content = await scrapeWithBrowser('https://example.com', {
 *   waitForSelector: 'article.content',
 *   timeout: 15000
 * });
 */
export async function scrapeWithBrowser(
  url: string,
  options: BrowserAutomationOptions = {}
): Promise<ScrapedContent> {
  const startTime = Date.now();
  const browser = await getBrowser();

  if (!browser) {
    throw new Error('Browser automation not available. Install Playwright: npm install playwright');
  }

  const {
    timeout = 15000,
    waitForSelector,
    waitForNetworkIdle = true,
    screenshot = false,
    userAgent = 'AINewsBot/1.0.0 (+https://ainews.app/bot)',
    viewport = { width: 1280, height: 720 },
  } = options;

  let page: Page | null = null;

  try {
    // Create new page with custom settings
    page = await browser.newPage({
      userAgent,
      viewport,
      // Block unnecessary resources for faster loading
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    // Block images, fonts, and media to speed up loading (optional)
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      
      if (['image', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Navigate to URL
    await page.goto(url, {
      timeout,
      waitUntil: waitForNetworkIdle ? 'networkidle' : 'domcontentloaded',
    });

    // Wait for specific selector if provided
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }

    // Extract content
    const [html, text, title, finalUrl] = await Promise.all([
      page.content(),
      page.evaluate(() => document.body.innerText),
      page.title(),
      page.url(),
    ]);

    // Take screenshot if requested
    let screenshotBuffer: Buffer | undefined;
    if (screenshot) {
      screenshotBuffer = await page.screenshot({ fullPage: true });
    }

    const loadTime = Date.now() - startTime;

    return {
      html,
      text,
      title,
      screenshot: screenshotBuffer,
      finalUrl,
      loadTime,
    };
  } finally {
    // Always close the page
    if (page) {
      await page.close();
    }
  }
}

/**
 * Scrape multiple URLs in parallel with browser automation
 * 
 * @example
 * const results = await scrapeMultipleWithBrowser([
 *   'https://site1.com',
 *   'https://site2.com'
 * ], { timeout: 10000 });
 */
export async function scrapeMultipleWithBrowser(
  urls: string[],
  options: BrowserAutomationOptions = {}
): Promise<Map<string, ScrapedContent | Error>> {
  const results = new Map<string, ScrapedContent | Error>();

  // Process in batches of 5 to avoid overwhelming the system
  const batchSize = 5;
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    
    const batchResults = await Promise.allSettled(
      batch.map((url) => scrapeWithBrowser(url, options))
    );

    batch.forEach((url, index) => {
      const result = batchResults[index];
      
      if (result.status === 'fulfilled') {
        results.set(url, result.value);
      } else {
        results.set(url, result.reason as Error);
      }
    });
  }

  return results;
}

/**
 * Extract article content from a page using browser automation
 * Combines browser scraping with readability extraction
 */
export async function extractArticleWithBrowser(
  url: string,
  options: BrowserAutomationOptions = {}
): Promise<{
  title: string;
  content: string;
  excerpt: string;
  author?: string;
  publishedDate?: string;
  images: string[];
  loadTime: number;
}> {
  const scraped = await scrapeWithBrowser(url, options);

  // Use browser context to extract structured data
  const browser = await getBrowser();
  if (!browser) {
    throw new Error('Browser not available');
  }

  const page = await browser.newPage();
  await page.setContent(scraped.html);

  try {
    // Extract article metadata using browser evaluation
    const articleData = await page.evaluate(() => {
      // Try to find article content
      const article = document.querySelector('article') || document.body;
      
      // Extract title (multiple strategies)
      const title =
        document.querySelector('h1')?.textContent?.trim() ||
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        document.title;

      // Extract author
      const author =
        document.querySelector('[rel="author"]')?.textContent?.trim() ||
        document.querySelector('meta[name="author"]')?.getAttribute('content') ||
        document.querySelector('[class*="author"]')?.textContent?.trim();

      // Extract published date
      const publishedDate =
        document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
        document.querySelector('time')?.getAttribute('datetime') ||
        document.querySelector('[class*="date"]')?.textContent?.trim();

      // Extract main content (remove nav, footer, ads)
      const contentSelectors = [
        'article',
        '[role="main"]',
        'main',
        '.post-content',
        '.article-content',
        '.entry-content',
      ];

      let content = '';
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          content = element.textContent?.trim() || '';
          break;
        }
      }

      // Extract images
      const images = Array.from(article.querySelectorAll('img'))
        .map((img) => img.src)
        .filter((src) => src && !src.includes('data:image'));

      // Generate excerpt (first 200 chars of content)
      const excerpt = content.substring(0, 200).trim() + '...';

      return {
        title: title || '',
        content: content || '',
        excerpt,
        author: author || undefined,
        publishedDate: publishedDate || undefined,
        images,
      };
    });

    await page.close();

    return {
      ...articleData,
      loadTime: scraped.loadTime,
    };
  } finally {
    await page.close();
  }
}

/**
 * Check if a URL requires browser automation
 * Heuristics based on known JS-heavy sites
 */
export function requiresBrowserAutomation(url: string): boolean {
  const jsHeavyDomains = [
    'medium.com',
    'substack.com',
    'techcrunch.com',
    'wired.com',
    'theverge.com',
    'reddit.com',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'facebook.com',
  ];

  try {
    const urlObj = new URL(url);
    return jsHeavyDomains.some((domain) => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Smart scrape: Try regular fetch first, fall back to browser if needed
 */
export async function smartScrape(
  url: string,
  options: BrowserAutomationOptions = {}
): Promise<ScrapedContent> {
  // First, try regular fetch (faster, cheaper)
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AINewsBot/1.0.0 (+https://ainews.app/bot)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // Check if content seems incomplete (common with JS-rendered sites)
    if (html.length < 5000 || html.includes('window.__INITIAL_STATE__')) {
      console.log('[SmartScrape] Content seems JS-rendered, using browser automation');
      return await scrapeWithBrowser(url, options);
    }

    // Regular fetch worked
    return {
      html,
      text: html.replace(/<[^>]*>/g, ' ').trim(),
      title: html.match(/<title>(.*?)<\/title>/)?.[1] || '',
      finalUrl: url,
      loadTime: 0,
    };
  } catch (error) {
    // Fetch failed, try browser automation
    console.log('[SmartScrape] Regular fetch failed, using browser automation:', error);
    return await scrapeWithBrowser(url, options);
  }
}

/**
 * Cleanup: Close browser instance
 * Call this when shutting down the application
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
