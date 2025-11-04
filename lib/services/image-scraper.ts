/**
 * Advanced Image Scraper
 * 
 * Scrapes article pages to find the best quality featured image
 * with multiple strategies and validation
 */

import { load } from 'cheerio';
import { validateAndRegisterImage } from './image-validator';

interface ImageCandidate {
  url: string;
  score: number;
  source: string; // Where it was found (og:image, article img, etc.)
}

/**
 * Scrapes article page for the best featured image
 */
export async function scrapeArticleImage(articleUrl: string): Promise<string | null> {
  try {
    console.log(`[ImageScraper] Scraping image from: ${articleUrl}`);

    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    if (!response.ok) {
      console.warn(`[ImageScraper] HTTP ${response.status} for ${articleUrl}`);
      return null;
    }

    const html = await response.text();
    const $ = load(html);

    // Collect all image candidates with scoring
    const candidates: ImageCandidate[] = [];

    // Strategy 1: Open Graph image (highest priority)
    const ogImage = $('meta[property="og:image"]').attr('content') || 
                    $('meta[property="og:image:secure_url"]').attr('content');
    if (ogImage) {
      candidates.push({
        url: normalizeUrl(ogImage, articleUrl),
        score: 100,
        source: 'og:image'
      });
    }

    // Strategy 2: Twitter Card image
    const twitterImage = $('meta[name="twitter:image"]').attr('content') ||
                         $('meta[property="twitter:image"]').attr('content');
    if (twitterImage) {
      candidates.push({
        url: normalizeUrl(twitterImage, articleUrl),
        score: 90,
        source: 'twitter:image'
      });
    }

    // Strategy 3: Article structured data
    $('script[type="application/ld+json"]').each((_, elem) => {
      try {
        const json = JSON.parse($(elem).html() || '{}');
        const image = json.image?.url || json.image;
        if (image && typeof image === 'string') {
          candidates.push({
            url: normalizeUrl(image, articleUrl),
            score: 85,
            source: 'structured-data'
          });
        }
      } catch {
        // Invalid JSON, skip
      }
    });

    // Strategy 4: Featured image with high-value classes/IDs (EXPANDED)
    const featuredSelectors = [
      // WordPress standard
      'img[class*="featured"]',
      'img[class*="hero"]',
      'img[id*="featured"]',
      'img[id*="hero"]',
      '.featured-image img',
      '.hero-image img',
      '.post-thumbnail img',
      '.article-image img',
      '.wp-post-image',
      
      // Common CMS patterns
      '.lead-image img',
      '.main-image img',
      '.header-image img',
      '.story-image img',
      '.cover-image img',
      
      // News sites
      '.article-header img',
      '.entry-header img',
      '.post-header img',
      'figure.lead img',
      'figure.featured img',
      
      // Data attributes (lazy loading)
      'img[data-src*="featured"]',
      'img[data-lazy-src]',
      'img[loading="eager"]',
      
      // Picture elements
      'picture source[media]',
      'picture img',
    ];

    featuredSelectors.forEach((selector) => {
      $(selector).each((_, elem) => {
        // Try multiple attribute sources
        const src = $(elem).attr('src') || 
                    $(elem).attr('data-src') || 
                    $(elem).attr('data-lazy-src') ||
                    $(elem).attr('srcset')?.split(',')[0]?.trim().split(' ')[0];
        
        if (src) {
          candidates.push({
            url: normalizeUrl(src, articleUrl),
            score: 70,
            source: selector
          });
        }
      });
    });

    // Strategy 5: First image in article content
    $('article img, main img, .article-content img, .post-content img, .entry-content img').slice(0, 3).each((_, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src');
      if (src) {
        candidates.push({
          url: normalizeUrl(src, articleUrl),
          score: 50,
          source: 'article-content'
        });
      }
    });

    // Strategy 6: Link rel image
    const linkImage = $('link[rel="image_src"]').attr('href');
    if (linkImage) {
      candidates.push({
        url: normalizeUrl(linkImage, articleUrl),
        score: 60,
        source: 'link-rel'
      });
    }

    // Sort candidates by score
    candidates.sort((a, b) => b.score - a.score);

    // Try each candidate until we find a valid one
    for (const candidate of candidates) {
      console.log(`[ImageScraper] Testing candidate: ${candidate.url.slice(0, 60)}... (source: ${candidate.source}, score: ${candidate.score})`);

      const validation = await validateAndRegisterImage(candidate.url);
      
      if (validation.isValid) {
        console.log(`[ImageScraper] ✓ Found valid image from ${candidate.source}`);
        return candidate.url;
      } else {
        console.log(`[ImageScraper] ✗ Invalid: ${validation.error}`);
      }
    }

    console.warn(`[ImageScraper] No valid image found for ${articleUrl}`);
    return null;

  } catch (error) {
    console.error(`[ImageScraper] Error scraping ${articleUrl}:`, error);
    return null;
  }
}

/**
 * Normalizes relative URLs to absolute
 */
function normalizeUrl(imageUrl: string, baseUrl: string): string {
  try {
    // Already absolute
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // Protocol-relative
    if (imageUrl.startsWith('//')) {
      return 'https:' + imageUrl;
    }

    // Relative path
    const base = new URL(baseUrl);
    if (imageUrl.startsWith('/')) {
      return `${base.protocol}//${base.host}${imageUrl}`;
    }

    // Relative to current path
    return new URL(imageUrl, baseUrl).href;
  } catch {
    return imageUrl;
  }
}

/**
 * Extracts image from RSS item with fallback strategies
 */
export function extractImageFromRSS(item: {
  enclosure?: { url?: string };
  content?: string;
  contentSnippet?: string;
  'media:content'?: { $?: { url?: string } };
  'media:thumbnail'?: { $?: { url?: string } };
}): string | null {
  // Strategy 1: Media content
  if (item['media:content']?.$?.url) {
    return item['media:content'].$.url;
  }

  // Strategy 2: Media thumbnail
  if (item['media:thumbnail']?.$?.url) {
    return item['media:thumbnail'].$.url;
  }

  // Strategy 3: Enclosure
  if (item.enclosure?.url) {
    const url = item.enclosure.url;
    if (url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)) {
      return url;
    }
  }

  // Strategy 4: Parse content HTML
  if (item.content) {
    const $ = load(item.content);
    const img = $('img').first().attr('src');
    if (img && img.startsWith('http')) {
      return img;
    }
  }

  // Strategy 5: Parse content snippet
  if (item.contentSnippet) {
    const $ = load(item.contentSnippet);
    const img = $('img').first().attr('src');
    if (img && img.startsWith('http')) {
      return img;
    }
  }

  return null;
}

/**
 * Gets the best image for an article with all strategies
 */
export async function getBestArticleImage(
  articleUrl: string,
  rssItem?: {
    enclosure?: { url?: string };
    content?: string;
    contentSnippet?: string;
  }
): Promise<string | null> {
  // Try RSS extraction first (fast)
  if (rssItem) {
    const rssImage = extractImageFromRSS(rssItem);
    if (rssImage) {
      const validation = await validateAndRegisterImage(rssImage);
      if (validation.isValid) {
        console.log('[ImageScraper] ✓ Valid image from RSS feed');
        return rssImage;
      }
      console.log(`[ImageScraper] RSS image invalid: ${validation.error}`);
    }
  }

  // Fallback to scraping article page
  return await scrapeArticleImage(articleUrl);
}
