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

/**
 * Capture screenshot using urlbox.io as fallback for blocked sites
 * Free tier: 1,000 requests/month
 */
async function captureScreenshot(url: string): Promise<string | null> {
  const apiKey = process.env.URLBOX_API_KEY;
  const apiSecret = process.env.URLBOX_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    console.log(`  ⚠️  urlbox.io not configured (skipping screenshot fallback)`);
    return null;
  }

  try {
    console.log(`  📸 Capturing screenshot with urlbox.io...`);
    
    // Generate HMAC token for authentication
    const crypto = await import('crypto');
    const queryString = `url=${encodeURIComponent(url)}&width=1200&height=630&format=png&quality=80&retina=false&thumb_width=800&wait_until=requestsfinished&block_ads=true&hide_cookie_banners=true`;
    const token = crypto
      .createHmac('sha256', apiSecret)
      .update(queryString)
      .digest('hex');
    
    const screenshotUrl = `https://api.urlbox.io/v1/${apiKey}/${token}/png?${queryString}`;
    
    // Validate the screenshot URL is accessible
    const response = await fetch(screenshotUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      console.log(`  ✓ Screenshot captured: ${screenshotUrl.slice(0, 60)}...`);
      return screenshotUrl;
    } else {
      console.log(`  ⚠️  Screenshot failed: HTTP ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error(`  ✗ Screenshot error:`, error instanceof Error ? error.message : String(error));
    return null;
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
      
      // Fallback to urlbox.io for 403 Forbidden and 429 Rate Limited
      if (response.status === 403 || response.status === 429) {
        return await captureScreenshot(url);
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
  
  process.exit(0);
}

main();
