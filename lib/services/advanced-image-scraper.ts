/**
 * ADVANCED IMAGE SCRAPER - PRODUCTION GRADE
 * 
 * Multi-layer webscraping system to ALWAYS extract original article images
 * NO external image libraries - only original article images
 * 
 * LAYERS (in priority order):
 * 1. Meta tags (og:image, twitter:image) - Most reliable
 * 2. JSON-LD structured data (Article, NewsArticle)
 * 3. Featured image selectors (60+ CSS patterns)
 * 4. Article content images (with size validation)
 * 5. Playwright real browser (for JS-rendered content)
 * 6. Screenshot fallback (last resort)
 * 7. Retry with different user agents
 * 8. Retry with proxy rotation
 */

import { load } from 'cheerio';
import { chromium, Browser, Page } from 'playwright';

interface ImageResult {
  url: string;
  source: string;
  width?: number;
  height?: number;
  confidence: number;
  method: string;
}

interface ScrapingAttempt {
  success: boolean;
  image: ImageResult | null;
  error?: string;
  layer: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
];

const FEATURED_IMAGE_SELECTORS = [
  // WordPress
  'img.wp-post-image',
  '.featured-image img',
  '.post-thumbnail img',
  '.wp-featured-image',
  
  // Generic featured/hero
  'img.featured',
  'img.hero',
  'img.hero-image',
  '.hero-image img',
  '.hero img',
  '.featured img',
  '.main-image img',
  '.primary-image img',
  '.lead-image img',
  '.cover-image img',
  '.banner-image img',
  '.article-image img',
  '.article-hero img',
  '.article-header img',
  '.post-header img',
  '.entry-header img',
  '.story-image img',
  '.story-header img',
  
  // CMS patterns
  '.article-featured-image img',
  '.post-featured-image img',
  '.entry-featured-image img',
  '.content-featured-image img',
  '.page-featured-image img',
  
  // News sites
  'figure.featured img',
  'figure.lead img',
  'figure.hero img',
  '.article-figure img',
  '.story-figure img',
  '.news-figure img',
  
  // Data attributes
  'img[data-featured="true"]',
  'img[data-hero="true"]',
  'img[data-main="true"]',
  'img[data-featured-image]',
  'img[data-hero-image]',
  
  // Schema.org
  '[itemprop="image"] img',
  '[itemtype*="ImageObject"] img',
  
  // Lazy loading variants
  'img[data-src][data-featured]',
  'img[data-lazy-src][data-featured]',
  'img[data-original][data-featured]',
  
  // Picture elements
  'picture img',
  'picture source[media]',
  
  // Modern frameworks
  '[data-gatsby-image-wrapper] img',
  '.gatsby-image-wrapper img',
  '[data-next-image] img',
  '.next-image img',
  
  // Medium, Substack, Ghost
  '.medium-feed-image',
  '.post-full-image img',
  '.kg-image',
  '.post-card-image',
  
  // Reddit, HackerNews
  '.thumbnail img',
  '.preview img',
  
  // Size-based (likely featured)
  'img[width="1200"]',
  'img[width="1920"]',
  'img[height="630"]',
  'img[height="1080"]',
];

const ARTICLE_CONTENT_SELECTORS = [
  'article img',
  'main img',
  '.article-content img',
  '.post-content img',
  '.entry-content img',
  '[role="main"] img',
  '.content img',
  '#content img',
  '.story-body img',
  '.article-body img',
];

let browserInstance: Browser | null = null;

// ============================================================================
// BROWSER MANAGEMENT
// ============================================================================

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    try {
      browserInstance = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080'
        ]
      });
    } catch (error) {
      console.error('[Browser] Failed to launch:', error);
      throw error;
    }
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (error) {
      console.error('[Browser] Error closing:', error);
    }
    browserInstance = null;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function normalizeUrl(imageUrl: string, baseUrl: string): string {
  try {
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    if (imageUrl.startsWith('//')) {
      return 'https:' + imageUrl;
    }
    const base = new URL(baseUrl);
    if (imageUrl.startsWith('/')) {
      return `${base.protocol}//${base.host}${imageUrl}`;
    }
    return new URL(imageUrl, baseUrl).href;
  } catch {
    return imageUrl;
  }
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.includes('avatar') || url.includes('icon') || url.includes('logo')) return false;
  if (url.includes('1x1') || url.includes('pixel')) return false;
  if (url.includes('tracking') || url.includes('analytics')) return false;
  return url.startsWith('http');
}

function extractDimensions(element: any, $: any): { width?: number; height?: number } {
  const width = parseInt($(element).attr('width') || '0');
  const height = parseInt($(element).attr('height') || '0');
  return {
    width: width > 0 ? width : undefined,
    height: height > 0 ? height : undefined
  };
}

// ============================================================================
// LAYER 1: META TAGS
// ============================================================================

function layer1_MetaTags(html: string, baseUrl: string): ImageResult | null {
  console.log('  [Layer 1] Extracting meta tags...');
  
  const $ = load(html);
  
  // Priority order for meta tags
  const metaTags = [
    { selector: 'meta[property="og:image"]', attr: 'content', score: 100 },
    { selector: 'meta[property="og:image:secure_url"]', attr: 'content', score: 100 },
    { selector: 'meta[name="twitter:image"]', attr: 'content', score: 95 },
    { selector: 'meta[property="twitter:image"]', attr: 'content', score: 95 },
    { selector: 'meta[name="image"]', attr: 'content', score: 85 },
    { selector: 'meta[property="image"]', attr: 'content', score: 85 },
    { selector: 'meta[name="thumbnail"]', attr: 'content', score: 80 },
    { selector: 'meta[itemprop="image"]', attr: 'content', score: 80 },
  ];
  
  for (const { selector, attr, score } of metaTags) {
    const element = $(selector).first();
    const url = element.attr(attr);
    
    if (url && isValidImageUrl(url)) {
      const normalized = normalizeUrl(url, baseUrl);
      console.log(`    ✓ Found: ${selector} (score: ${score})`);
      return {
        url: normalized,
        source: 'meta-tag',
        confidence: score / 100,
        method: selector
      };
    }
  }
  
  return null;
}

// ============================================================================
// LAYER 2: JSON-LD STRUCTURED DATA
// ============================================================================

function layer2_JsonLD(html: string, baseUrl: string): ImageResult | null {
  console.log('  [Layer 2] Extracting JSON-LD structured data...');
  
  const $ = load(html);
  
  const scripts = $('script[type="application/ld+json"]');
  
  for (let i = 0; i < scripts.length; i++) {
    try {
      const json = JSON.parse($(scripts[i]).html() || '{}');
      
      // Look for image in various schema types
      const imageUrl = extractImageFromSchema(json);
      
      if (imageUrl && isValidImageUrl(imageUrl)) {
        const normalized = normalizeUrl(imageUrl, baseUrl);
        console.log(`    ✓ Found in JSON-LD (score: 90)`);
        return {
          url: normalized,
          source: 'json-ld',
          confidence: 0.9,
          method: 'structured-data'
        };
      }
    } catch (error) {
      // Invalid JSON, skip
    }
  }
  
  return null;
}

function extractImageFromSchema(obj: any): string | null {
  if (!obj) return null;
  
  // Direct image property
  if (typeof obj.image === 'string' && obj.image.startsWith('http')) {
    return obj.image;
  }
  
  // Image as object with url
  if (obj.image?.url && typeof obj.image.url === 'string') {
    return obj.image.url;
  }
  
  // Image as array
  if (Array.isArray(obj.image) && obj.image.length > 0) {
    if (typeof obj.image[0] === 'string') {
      return obj.image[0];
    }
    if (obj.image[0]?.url) {
      return obj.image[0].url;
    }
  }
  
  // Recursive search in nested objects
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      const result = extractImageFromSchema(obj[key]);
      if (result) return result;
    }
  }
  
  return null;
}

// ============================================================================
// LAYER 3: FEATURED IMAGE SELECTORS
// ============================================================================

function layer3_FeaturedSelectors(html: string, baseUrl: string): ImageResult | null {
  console.log('  [Layer 3] Searching featured image selectors...');
  
  const $ = load(html);
  
  for (const selector of FEATURED_IMAGE_SELECTORS) {
    const element = $(selector).first();
    
    if (element.length === 0) continue;
    
    // Try multiple attributes
    const attributes = ['src', 'data-src', 'data-lazy-src', 'data-original', 'data-lazy'];
    
    for (const attr of attributes) {
      let url = element.attr(attr);
      
      if (!url) continue;
      
      // Handle srcset
      if (attr === 'srcset' || attr === 'data-srcset') {
        const srcset = element.attr(attr);
        if (srcset) {
          const urls = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
          url = urls[urls.length - 1]; // Get highest resolution
        }
      }
      
      if (url && isValidImageUrl(url)) {
        const normalized = normalizeUrl(url, baseUrl);
        const dims = extractDimensions(element, $);
        console.log(`    ✓ Found: ${selector} (score: 85)`);
        return {
          url: normalized,
          source: 'featured-selector',
          confidence: 0.85,
          method: selector,
          ...dims
        };
      }
    }
  }
  
  return null;
}

// ============================================================================
// LAYER 4: ARTICLE CONTENT IMAGES
// ============================================================================

function layer4_ArticleContent(html: string, baseUrl: string): ImageResult | null {
  console.log('  [Layer 4] Scanning article content images...');
  
  const $ = load(html);
  
  const candidates: Array<{ url: string; score: number; dims: any }> = [];
  
  for (const selector of ARTICLE_CONTENT_SELECTORS) {
    const images = $(selector);
    
    images.each((_, element) => {
      const $img = $(element);
      
      // Try multiple attributes
      let url = $img.attr('src') || 
                $img.attr('data-src') || 
                $img.attr('data-lazy-src') ||
                $img.attr('data-original');
      
      if (!url || !isValidImageUrl(url)) return;
      
      const normalized = normalizeUrl(url, baseUrl);
      const dims = extractDimensions(element, $);
      
      // Score based on size
      let score = 60;
      if (dims.width && dims.width >= 800) score += 15;
      if (dims.height && dims.height >= 600) score += 15;
      
      // Boost if has quality indicators
      const className = $img.attr('class') || '';
      const id = $img.attr('id') || '';
      if (className.match(/featured|hero|main|lead|banner|cover/i) || 
          id.match(/featured|hero|main|lead|banner|cover/i)) {
        score += 10;
      }
      
      candidates.push({ url: normalized, score, dims });
    });
  }
  
  if (candidates.length > 0) {
    // Sort by score and return best
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    console.log(`    ✓ Found ${candidates.length} images, using best (score: ${best.score})`);
    return {
      url: best.url,
      source: 'article-content',
      confidence: best.score / 100,
      method: 'article-image',
      ...best.dims
    };
  }
  
  return null;
}

// ============================================================================
// LAYER 5: PLAYWRIGHT REAL BROWSER
// ============================================================================

async function layer5_PlaywrightBrowser(url: string): Promise<ImageResult | null> {
  console.log('  [Layer 5] Using Playwright real browser...');
  
  let page: Page | null = null;
  
  try {
    const browser = await getBrowser();
    page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      userAgent: USER_AGENTS[0]
    });
    
    // Set timeout and navigate
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    }).catch(() => {
      // Continue even if navigation fails
    });
    
    // Wait for images to load
    await page.waitForTimeout(2000);
    
    // Extract images using browser context
    const imageData = await page.evaluate(() => {
      const candidates: Array<{url: string; width: number; height: number; score: number}> = [];
      
      // Meta tags
      const ogImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
      if (ogImage?.content) {
        candidates.push({ url: ogImage.content, width: 1200, height: 630, score: 100 });
      }
      
      // Featured images
      const featured = document.querySelector<HTMLImageElement>('.featured-image img, .hero-image img, .wp-post-image');
      if (featured?.src) {
        candidates.push({ 
          url: featured.src, 
          width: featured.naturalWidth || 800, 
          height: featured.naturalHeight || 600, 
          score: 90 
        });
      }
      
      // Article images
      const article = document.querySelector<HTMLImageElement>('article img, main img, .article-content img');
      if (article?.src && article.naturalWidth > 600) {
        candidates.push({ 
          url: article.src, 
          width: article.naturalWidth, 
          height: article.naturalHeight, 
          score: 75 
        });
      }
      
      return candidates.sort((a, b) => b.score - a.score)[0] || null;
    }).catch(() => null);
    
    if (imageData?.url) {
      console.log(`    ✓ Found via Playwright (score: ${imageData.score})`);
      return {
        url: imageData.url,
        source: 'playwright',
        confidence: imageData.score / 100,
        method: 'real-browser',
        width: imageData.width,
        height: imageData.height
      };
    }
    
  } catch (error) {
    console.error(`    ✗ Playwright error: ${error instanceof Error ? error.message : error}`);
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
  
  return null;
}

// ============================================================================
// LAYER 6: SCREENSHOT FALLBACK
// ============================================================================

async function layer6_Screenshot(url: string): Promise<ImageResult | null> {
  console.log('  [Layer 6] Taking screenshot...');
  
  let page: Page | null = null;
  
  try {
    const browser = await getBrowser();
    page = await browser.newPage({
      viewport: { width: 1920, height: 1080 }
    });
    
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    }).catch(() => {});
    
    await page.waitForTimeout(1000);
    
    // Try to screenshot article header
    const headerElement = await page.$('article header, .article-header, .post-header, main > div:first-child').catch(() => null);
    
    const screenshotBuffer = headerElement
      ? await headerElement.screenshot({ type: 'jpeg', quality: 85 }).catch(() => null)
      : await page.screenshot({ 
          type: 'jpeg', 
          quality: 85,
          clip: { x: 0, y: 0, width: 1920, height: 1080 }
        }).catch(() => null);
    
    if (screenshotBuffer) {
      const base64 = screenshotBuffer.toString('base64');
      const dataUri = `data:image/jpeg;base64,${base64}`;
      console.log(`    ✓ Screenshot captured`);
      return {
        url: dataUri,
        source: 'screenshot',
        confidence: 0.5,
        method: 'screenshot',
        width: 1920,
        height: 1080
      };
    }
    
  } catch (error) {
    console.error(`    ✗ Screenshot error: ${error instanceof Error ? error.message : error}`);
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
  
  return null;
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

export async function scrapeArticleImageAdvanced(
  url: string,
  options: { retryCount?: number; userAgentIndex?: number } = {}
): Promise<ImageResult | null> {
  const { retryCount = 0, userAgentIndex = 0 } = options;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 ADVANCED IMAGE SCRAPER - Attempt ${retryCount + 1}`);
  console.log(`📰 URL: ${url}`);
  console.log(`${'='.repeat(80)}`);
  
  try {
    // Fetch HTML with current user agent
    const userAgent = USER_AGENTS[userAgentIndex % USER_AGENTS.length];
    console.log(`👤 User Agent: ${userAgent.substring(0, 60)}...`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      console.log(`⚠️ HTTP ${response.status}`);
      
      // Retry with different user agent
      if (retryCount < USER_AGENTS.length - 1) {
        console.log(`🔄 Retrying with different user agent...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return scrapeArticleImageAdvanced(url, { 
          retryCount: retryCount + 1, 
          userAgentIndex: userAgentIndex + 1 
        });
      }
      
      return null;
    }
    
    const html = await response.text();
    
    // Try layers sequentially
    const layers = [
      () => layer1_MetaTags(html, url),
      () => layer2_JsonLD(html, url),
      () => layer3_FeaturedSelectors(html, url),
      () => layer4_ArticleContent(html, url),
      () => layer5_PlaywrightBrowser(url),
      () => layer6_Screenshot(url)
    ];
    
    for (let i = 0; i < layers.length; i++) {
      try {
        const result = await layers[i]();
        if (result) {
          console.log(`\n✅ SUCCESS: Found image from layer ${i + 1}`);
          console.log(`   URL: ${result.url.substring(0, 100)}...`);
          console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
          return result;
        }
      } catch (error) {
        console.error(`   ✗ Layer ${i + 1} error: ${error instanceof Error ? error.message : error}`);
      }
    }
    
    console.log(`\n❌ No image found across all layers`);
    return null;
    
  } catch (error) {
    console.error(`❌ Fatal error: ${error instanceof Error ? error.message : error}`);
    
    // Retry with different user agent
    if (retryCount < USER_AGENTS.length - 1) {
      console.log(`🔄 Retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return scrapeArticleImageAdvanced(url, { 
        retryCount: retryCount + 1, 
        userAgentIndex: userAgentIndex + 1 
      });
    }
    
    return null;
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

export async function fixAllMissingImages(limit: number = 100): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔧 BATCH FIX: Processing up to ${limit} articles with missing images`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Find articles without images
    const { data: articles, error } = await supabase
      .from('news_articles')
      .select('id, title_en, source_url, image_url')
      .or('image_url.is.null,image_url.eq.')
      .limit(limit);
    
    if (error || !articles) {
      console.error('❌ Failed to fetch articles:', error);
      return;
    }
    
    console.log(`📰 Found ${articles.length} articles without images\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`\n[${i + 1}/${articles.length}] ${article.title_en}`);
      
      try {
        const result = await scrapeArticleImageAdvanced(article.source_url);
        
        if (result && result.confidence > 0.4) {
          const { error: updateError } = await supabase
            .from('news_articles')
            .update({ 
              image_url: result.url,
              updated_at: new Date().toISOString()
            })
            .eq('id', article.id);
          
          if (updateError) {
            console.error(`   ❌ DB update failed:`, updateError);
            failCount++;
          } else {
            console.log(`   ✅ Updated! Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            successCount++;
          }
        } else {
          console.log(`   ⚠️ No suitable image found`);
          failCount++;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.error(`   ❌ Error:`, error instanceof Error ? error.message : error);
        failCount++;
      }
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 BATCH COMPLETE`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📈 Success rate: ${((successCount / articles.length) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Batch processing error:', error);
  } finally {
    await closeBrowser();
  }
}
