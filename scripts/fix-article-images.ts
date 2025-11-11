#!/usr/bin/env node
/**
 * Fix Article Images Script
 * 
 * Re-scrapes articles to get the correct featured images
 * Run: npm run ai:fix-images
 */

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
  loadEnv({ path: envLocal });
} else {
  loadEnv();
}

import { load } from 'cheerio';
import { getSupabaseServerClient } from '../lib/db/supabase';
import { chromium, type Browser } from 'playwright';

let browserInstance: Browser | null = null;

/**
 * Get or create a persistent browser instance
 * 100% FREE - uses local Playwright
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
  }
  return browserInstance;
}

/**
 * Scrape with advanced Playwright anti-detection for blocked sites
 * 100% FREE - no API costs, unlimited usage
 */
async function scrapeWithPlaywright(url: string): Promise<string | null> {
  let context = null;
  let page = null;
  
  try {
    console.log(`  🎭 Using Playwright with anti-detection...`);
    
    const browser = await getBrowser();
    
    // Create context with realistic fingerprint
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });
    
    page = await context.newPage();
    
    // Remove automation detection
    await page.addInitScript(() => {
      // Override the navigator.webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // Mock plugins and mimeTypes
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });
    
    // Navigate with timeout
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    // Wait a bit for dynamic content
    await page.waitForTimeout(2000);
    
    // Extract image using multiple selectors
    const imageUrl = await page.evaluate(() => {
      const selectors = [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'meta[property="twitter:image"]',
        'meta[name="og:image"]',
        'article img[src*="featured"]',
        'article img[src*="hero"]',
        '.article-image img',
        '.post-thumbnail img',
        'article img:not([src*="avatar"]):not([src*="icon"]):not([src*="logo"])',
        'main img:not([src*="avatar"]):not([src*="icon"]):not([src*="logo"])',
        '.content img:not([src*="avatar"]):not([src*="icon"]):not([src*="logo"])'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const attr = selector.startsWith('meta') ? 'content' : 'src';
          let imgUrl = element.getAttribute(attr);
          
          if (imgUrl) {
            // Make absolute URL
            if (imgUrl.startsWith('//')) {
              imgUrl = 'https:' + imgUrl;
            } else if (imgUrl.startsWith('/')) {
              imgUrl = window.location.origin + imgUrl;
            }
            
            // Validate it's an actual image URL
            if (imgUrl.startsWith('http') && 
                !imgUrl.includes('avatar') && 
                !imgUrl.includes('icon') &&
                !imgUrl.includes('logo') &&
                !imgUrl.includes('1x1')) {
              return imgUrl;
            }
          }
        }
      }
      return null;
    });
    
    if (imageUrl) {
      console.log(`  ✓ Found with Playwright: ${imageUrl.slice(0, 60)}...`);
      return imageUrl;
    }
    
    console.log(`  ⚠️  No image found with Playwright`);
    return null;
    
  } catch (error) {
    console.error(`  ✗ Playwright error:`, error instanceof Error ? error.message : String(error));
    return null;
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
  }
}

async function scrapeArticleImage(url: string): Promise<string | null> {
  try {
    console.log(`  Scraping: ${url.slice(0, 60)}...`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.warn(`  ⚠️  HTTP ${response.status}`);
      
      // Fallback to Playwright for 403 Forbidden and 429 Rate Limited
      // 100% FREE - no API costs!
      if (response.status === 403 || response.status === 429) {
        return await scrapeWithPlaywright(url);
      }
      
      return null;
    }
    
    const html = await response.text();
    const $ = load(html);
    
    const imageSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[property="twitter:image"]',
      'article img[src*="featured"]',
      'article img[src*="hero"]',
      '.article-image img',
      '.post-thumbnail img',
      'article img',
      'main img',
      '.content img'
    ];
    
    for (const selector of imageSelectors) {
      const attr = selector.startsWith('meta') ? 'content' : 'src';
      let imgUrl = $(selector).first().attr(attr);
      
      if (imgUrl) {
        if (imgUrl.startsWith('//')) {
          imgUrl = 'https:' + imgUrl;
        } else if (imgUrl.startsWith('/')) {
          const urlObj = new URL(url);
          imgUrl = `${urlObj.protocol}//${urlObj.host}${imgUrl}`;
        }
        
        if (imgUrl.startsWith('http') && 
            !imgUrl.includes('avatar') && 
            !imgUrl.includes('icon') &&
            !imgUrl.includes('logo') &&
            !imgUrl.includes('1x1')) {
          console.log(`  ✓ Found: ${imgUrl.slice(0, 60)}...`);
          return imgUrl;
        }
      }
    }
    
    console.log(`  ⚠️  No image found`);
    return null;
  } catch (error) {
    console.error(`  ✗ Error:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function main() {
  console.log('[Fix Images] Starting...\n');
  
  const db = getSupabaseServerClient();
  
  // Get ALL articles with default/placeholder images (no limit)
  const { data: articles, error } = await db
    .from('news_articles')
    .select('id, title_en, title_es, source_url, image_url')
    .or('image_url.is.null,image_url.like.%unsplash%,image_url.like.%googleusercontent%,image_url.like.%redditmedia%')
    .order('published_at', { ascending: false });
  
  if (error) {
    console.error('[Fix Images] Database error:', error);
    process.exit(1);
  }
  
  if (!articles || articles.length === 0) {
    console.log('[Fix Images] No articles need fixing!');
    process.exit(0);
  }
  
  console.log(`[Fix Images] Found ${articles.length} articles to fix\n`);
  
  let fixed = 0;
  let failed = 0;
  
  for (const article of articles) {
    const title = article.title_en || article.title_es || 'Untitled';
    console.log(`\n[${articles.indexOf(article) + 1}/${articles.length}] ${title.slice(0, 50)}...`);
    
    const newImage = await scrapeArticleImage(article.source_url);
    
    if (newImage) {
      const { error: updateError } = await db
        .from('news_articles')
        .update({ image_url: newImage })
        .eq('id', article.id);
      
      if (updateError) {
        console.error(`  ✗ Update failed:`, updateError);
        failed++;
      } else {
        console.log(`  ✓ Updated!`);
        fixed++;
      }
    } else {
      failed++;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n[Fix Images] Complete!`);
  console.log(`  ✓ Fixed: ${fixed}`);
  console.log(`  ✗ Failed: ${failed}`);
  
  // Cleanup browser instance
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
  
  process.exit(0);
}

main();
