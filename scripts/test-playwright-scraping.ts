#!/usr/bin/env node
/**
 * Test Playwright Anti-Detection
 * Quick test to verify OpenAI scraping works
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

import { chromium } from 'playwright';

async function testPlaywrightScraping() {
  console.log('🎭 Testing Playwright Anti-Detection on OpenAI...\n');
  
  const testUrl = 'https://openai.com/index/introducing-aardvark';
  
  let browser = null;
  let context = null;
  let page = null;
  
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    console.log('✓ Browser launched');
    
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    console.log('✓ Context created');
    
    page = await context.newPage();
    
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });
    
    console.log('✓ Anti-detection scripts injected');
    console.log(`\n📡 Navigating to: ${testUrl}`);
    
    await page.goto(testUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    console.log('✓ Page loaded');
    
    await page.waitForTimeout(2000);
    
    console.log('✓ Waited for dynamic content\n');
    
    const imageUrl = await page.evaluate(() => {
      const selectors = [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'article img',
        'main img'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const attr = selector.startsWith('meta') ? 'content' : 'src';
          let imgUrl = element.getAttribute(attr);
          
          if (imgUrl) {
            if (imgUrl.startsWith('//')) {
              imgUrl = 'https:' + imgUrl;
            } else if (imgUrl.startsWith('/')) {
              imgUrl = window.location.origin + imgUrl;
            }
            
            if (imgUrl.startsWith('http')) {
              return imgUrl;
            }
          }
        }
      }
      return null;
    });
    
    if (imageUrl) {
      console.log('✅ SUCCESS! Found image:');
      console.log(`   ${imageUrl}\n`);
    } else {
      console.log('⚠️  No image found (but page loaded successfully)\n');
    }
    
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

testPlaywrightScraping();
