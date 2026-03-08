/**
 * Advanced Image Scraper - Ultra Edition
 * 
 * Scrapes article pages to find the best quality featured image
 * with 12+ comprehensive strategies and validation
 * 
 * SCRAPING STRATEGIES (in priority order):
 * 
 * 1. Open Graph (og:image, og:image:secure_url) - Score: 100
 *    - Most reliable for social sharing
 *    - Usually high quality and relevant
 * 
 * 2. Twitter Card (twitter:image) - Score: 90
 *    - Secondary social meta tag
 *    - Good quality fallback
 * 
 * 3. JSON-LD Structured Data (Article, ImageObject) - Score: 80-85
 *    - Schema.org markup
 *    - NewsArticle, Article, ImageObject types
 *    - Handles both single images and arrays
 * 
 * 4. Featured Image Selectors (60+ CSS selectors) - Score: 70
 *    - WordPress (.wp-post-image, .featured-image)
 *    - CMS patterns (.lead-image, .hero-image, .banner-image)
 *    - News sites (.article-header img, figure.featured)
 *    - Lazy loading (data-src, data-lazy-src, data-original)
 *    - Modern frameworks (Gatsby, Next.js image wrappers)
 *    - Picture elements (source[srcset], picture img)
 *    - Schema.org attributes ([itemprop="image"])
 *    - Platform-specific (Medium, Substack, Ghost, Reddit)
 * 
 * 5. Additional Meta Tags - Score: 40-75
 *    - meta[name="image"]
 *    - meta[property="image"]
 *    - meta[name="thumbnail"]
 *    - meta[itemprop="image"]
 *    - meta[name="msapplication-TileImage"]
 * 
 * 6. Article Content Images (Enhanced) - Score: 50-65
 *    - Scans article, main, .content, #content
 *    - Size-aware scoring (boosts for 800x600+)
 *    - Class/ID quality indicators
 *    - Multi-attribute detection (src, data-src, data-original)
 * 
 * 7. CSS Background Images - Score: 55
 *    - Parses inline style attributes
 *    - Extracts from background-image: url(...)
 *    - Checks .bg-image, .background-image classes
 * 
 * 8. AMP Images (amp-img) - Score: 75
 *    - Special handling for AMP pages
 *    - Usually optimized and validated
 * 
 * 9. Noscript Fallbacks - Score: 65
 *    - Parses <noscript> tags
 *    - Often contains non-lazy-loaded version
 *    - Good quality baseline
 * 
 * 10. Link Rel Image - Score: 60
 *     - <link rel="image_src">
 *     - Legacy but still used
 * 
 * 11. RSS Enclosure - Fast path before scraping
 *     - media:content
 *     - media:thumbnail
 *     - enclosure with image extension
 *     - Content/contentSnippet HTML parsing
 * 
 * 12. Multi-Attribute Detection
 *     - src, data-src, data-lazy-src, data-original
 *     - data-srcset, srcset (parses responsive sets)
 *     - data-lazy, data-sizes
 * 
 * VALIDATION PIPELINE:
 * - Each candidate is tested with validateAndRegisterImage()
 * - Duplicate detection via hash
 * - HTTP HEAD request for content-type and size
 * - Minimum 5KB size requirement
 * - Blacklist filtering (avatars, logos, icons, tracking pixels)
 * - Content-Type validation (image/*)
 * 
 * ATTRIBUTE SOURCES (comprehensive):
 * - src (standard)
 * - data-src (lazy loading)
 * - data-lazy-src (alternative lazy)
 * - data-original (unveil.js, etc.)
 * - data-lazy (custom implementations)
 * - data-srcset (responsive)
 * - srcset (native responsive)
 * - data-sizes (responsive sizes)
 */

import { load } from 'cheerio';
import { validateAndRegisterImage } from './image-validator';
import { validateUrlForSSRFSync } from '../utils/ssrf-protection';
import { getDomainProfile, transformImageUrl, isBlacklistedImage } from './domain-profiles';
import { getOEmbedImagesFromContent, isOEmbedUrl, getOEmbedImage } from './oembed';

function isDataUri(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('data:');
}

function pickBestFromSrcset(raw: string | undefined, baseUrl: string): string | null {
  if (!raw) return null;

  const candidates = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [urlPart, descriptor] = entry.split(/\s+/);
      let score = 0;

      if (descriptor?.endsWith('w')) {
        const width = parseInt(descriptor, 10);
        if (!Number.isNaN(width)) {
          score = width;
        }
      } else if (descriptor?.endsWith('x')) {
        const density = parseFloat(descriptor);
        if (!Number.isNaN(density)) {
          score = Math.round(density * 1000);
        }
      }

      return {
        url: urlPart,
        score,
      };
    })
    .filter((candidate) => candidate.url && !isDataUri(candidate.url));

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best) {
    return null;
  }

  try {
    return normalizeUrl(best.url, baseUrl);
  } catch {
    return null;
  }
}

function collectJsonLdImages(json: unknown, images: Set<string>, baseUrl: string): void {
  if (!json) return;

  if (typeof json === 'string') {
    if (!isDataUri(json)) {
      images.add(normalizeUrl(json, baseUrl));
    }
    return;
  }

  if (Array.isArray(json)) {
    json.forEach((entry) => collectJsonLdImages(entry, images, baseUrl));
    return;
  }

  if (typeof json === 'object') {
    const record = json as Record<string, unknown>;
    if (typeof record.url === 'string' && !isDataUri(record.url)) {
      images.add(normalizeUrl(record.url, baseUrl));
    }

    Object.values(record).forEach((value) => collectJsonLdImages(value, images, baseUrl));
  }
}

interface ImageCandidate {
  url: string;
  score: number;
  source: string; // Where it was found (og:image, article img, etc.)
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function isLikelyDecorativeImage(url: string): boolean {
  const lowered = url.toLowerCase();
  const patterns: RegExp[] = [
    /logo/,
    /favicon/,
    /icon/,
    /avatar/,
    /sprite/,
    /apple-touch-icon/,
    /site\.webmanifest/,
    /default[-_]?social/,
    /social[-_]?share/,
  ];
  return patterns.some((pattern) => pattern.test(lowered));
}

function scoreCandidateForEditorialUse(candidate: ImageCandidate, articleUrl: string): number {
  let adjusted = candidate.score;
  const articleHost = getHostname(articleUrl);
  const imageHost = getHostname(candidate.url);

  if (articleHost && imageHost) {
    if (imageHost === articleHost || imageHost.endsWith(`.${articleHost}`) || articleHost.endsWith(`.${imageHost}`)) {
      adjusted += 10;
    }
    if (imageHost.includes('cdn') || imageHost.includes('images') || imageHost.includes('media')) {
      adjusted += 3;
    }
  }

  if (isLikelyDecorativeImage(candidate.url)) {
    adjusted -= 40;
  }

  const normalized = candidate.url.toLowerCase();
  if (normalized.includes('/wp-content/uploads/')) adjusted += 6;
  if (normalized.includes('/uploads/')) adjusted += 4;
  if (normalized.includes('/thumb') || normalized.includes('/thumbnail')) adjusted -= 8;

  return adjusted;
}

/**
 * Scrapes article page for the best featured image
 */
export async function scrapeArticleImage(articleUrl: string): Promise<string | null> {
  try {
    console.log(`[ImageScraper] Scraping image from: ${articleUrl}`);

    // Get domain-specific profile for optimized scraping
    const domainProfile = getDomainProfile(articleUrl);
    console.log(`[ImageScraper] Using domain profile: ${domainProfile.domain}`);

    // SSRF Protection: Validate article URL before fetching
    const urlValidation = validateUrlForSSRFSync(articleUrl);
    if (!urlValidation.valid) {
      console.warn(`[ImageScraper] SSRF blocked: ${urlValidation.reason}`);
      return null;
    }

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
        const raw = $(elem).html();
        if (!raw) return;

        const json = JSON.parse(raw);
        const structuredImages = new Set<string>();
        collectJsonLdImages(json, structuredImages, articleUrl);

        structuredImages.forEach((imageUrl) => {
          if (!imageUrl) return;
          candidates.push({
            url: imageUrl,
            score: 85,
            source: 'structured-data'
          });
        });
      } catch {
        // Invalid JSON, skip
      }
    });

    // Strategy 3.5: Domain profile primary selectors (site-specific, score 80)
    // These are hand-tuned CSS selectors for known publishers — higher confidence than generic list
    if (domainProfile.domain !== 'generic') {
      domainProfile.selectors.primary.forEach((selector) => {
        // Skip meta selectors — already covered by Strategy 1-3
        if (selector.startsWith('meta[')) return;

        $(selector).each((_, elem) => {
          const $elem = $(elem);
          const srcsetCandidate = pickBestFromSrcset(
            $elem.attr('data-srcset') || $elem.attr('srcset'),
            articleUrl
          );
          const directSrc =
            $elem.attr('src') ||
            $elem.attr('data-src') ||
            $elem.attr('data-lazy-src') ||
            $elem.attr('data-original');
          const chosen =
            srcsetCandidate ||
            (directSrc && !isDataUri(directSrc) ? normalizeUrl(directSrc, articleUrl) : null);
          if (chosen) {
            candidates.push({
              url: chosen,
              score: 80,
              source: `domain-profile-primary:${selector}`,
            });
          }
        });
      });

      // Strategy 3.7: Domain profile fallback selectors (site-specific, score 65)
      domainProfile.selectors.fallback.forEach((selector) => {
        if (selector.startsWith('meta[')) return;

        $(selector).each((_, elem) => {
          const $elem = $(elem);
          const srcsetCandidate = pickBestFromSrcset(
            $elem.attr('data-srcset') || $elem.attr('srcset'),
            articleUrl
          );
          const directSrc =
            $elem.attr('src') ||
            $elem.attr('data-src') ||
            $elem.attr('data-lazy-src') ||
            $elem.attr('data-original');
          const chosen =
            srcsetCandidate ||
            (directSrc && !isDataUri(directSrc) ? normalizeUrl(directSrc, articleUrl) : null);
          if (chosen) {
            candidates.push({
              url: chosen,
              score: 65,
              source: `domain-profile-fallback:${selector}`,
            });
          }
        });
      });
    }

    // Strategy 4: Featured image with high-value classes/IDs (ULTRA EXPANDED)
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
      '.banner-image img',
      '.top-image img',
      '.primary-image img',
      
      // News sites
      '.article-header img',
      '.entry-header img',
      '.post-header img',
      'figure.lead img',
      'figure.featured img',
      'figure.article img',
      '.article-figure img',
      '.story-figure img',
      
      // Data attributes (lazy loading)
      'img[data-src*="featured"]',
      'img[data-lazy-src]',
      'img[data-original]',
      'img[data-lazy]',
      'img[loading="eager"]',
      'img[data-srcset]',
      'img[data-sizes]',
      
      // Picture elements
      'picture source[media]',
      'picture img',
      'picture source[srcset]',
      
      // Modern frameworks (React, Vue, Angular)
      '[data-gatsby-image-wrapper] img',
      '.gatsby-image-wrapper img',
      '[data-next-image] img',
      '.next-image img',
      'img[decoding="async"]',
      
      // Schema.org image
      '[itemprop="image"]',
      '[itemtype*="ImageObject"] img',
      
      // Responsive image patterns
      'img[sizes]',
      'source[type="image/webp"]',
      'source[type="image/avif"]',
      
      // Medium, Substack, Ghost
      '.medium-feed-image',
      '.post-full-image img',
      '.kg-image',
      '.post-card-image',
      
      // Reddit, HackerNews
      '.thumbnail img',
      '.preview img',
      '[data-click-id="thumbnail"] img',
      
      // ArXiv, academic
      '.figure img',
      '.teaser-image img',
      'img[alt*="Figure"]',

      // Data-attribute image IDs (Bloomberg, Reuters, WSJ, etc.)
      'img[data-media-id]',
      'img[data-image-id]',
      'img[data-imgid]',

      // Component-based designs (React/Vue/Angular news sites)
      '[data-testid*="image"] img',
      '[data-testid*="hero"] img',
      '[data-component*="image"] img',
      '[data-component*="hero"] img',
      '[data-module*="image"] img',

      // Figure + figcaption proximity (editorial photos)
      'figure:has(figcaption) > img',
      'figure:has(figcaption) img',
      '.article-body figure img',
      '.article-content figure img',

      // Paywall/subscription sites bypass patterns
      '.paywall-hero img',
      '[class*="Story_lead"] img',
      '[class*="Article_header"] img',
      '[class*="article-cover"] img',
      
      // Generic high-quality indicators
      'img[width="1200"]',
      'img[width="1920"]',
      'img[height="630"]',
      'img[height="1080"]',
    ];

    featuredSelectors.forEach((selector) => {
      $(selector).each((_, elem) => {
        const $elem = $(elem);
        const srcsetCandidate = pickBestFromSrcset(
          $elem.attr('data-srcset') || $elem.attr('srcset'),
          articleUrl
        );

        const directSrc = $elem.attr('src') || 
                          $elem.attr('data-src') || 
                          $elem.attr('data-lazy-src') ||
                          $elem.attr('data-original') ||
                          $elem.attr('data-lazy');

        const chosen = srcsetCandidate || (directSrc && !isDataUri(directSrc) ? normalizeUrl(directSrc, articleUrl) : null);

        if (chosen) {
          candidates.push({
            url: chosen,
            score: 70,
            source: selector
          });
        }
      });
    });

    // Strategy 5: Meta tags (additional)
    const metaSelectors = [
      { selector: 'meta[name="image"]', attr: 'content', score: 75 },
      { selector: 'meta[property="image"]', attr: 'content', score: 75 },
      { selector: 'meta[name="thumbnail"]', attr: 'content', score: 70 },
      { selector: 'meta[itemprop="image"]', attr: 'content', score: 75 },
      { selector: 'meta[name="msapplication-TileImage"]', attr: 'content', score: 40 },
    ];

    metaSelectors.forEach(({ selector, attr, score }) => {
      const content = $(selector).attr(attr);
      if (content) {
        candidates.push({
          url: normalizeUrl(content, articleUrl),
          score,
          source: selector
        });
      }
    });

    // Strategy 7: First large image in article content (enhanced detection)
    $('article img, main img, .article-content img, .post-content img, .entry-content img, [role="main"] img, .content img, #content img').each((_, elem) => {
      const $img = $(elem);

      const srcsetCandidate = pickBestFromSrcset(
        $img.attr('data-srcset') || $img.attr('srcset'),
        articleUrl
      );

      const rawSrc = $img.attr('src') || 
                     $img.attr('data-src') ||
                     $img.attr('data-original') ||
                     $img.attr('data-lazy-src');

      const src = srcsetCandidate || (rawSrc && !isDataUri(rawSrc) ? normalizeUrl(rawSrc, articleUrl) : null);

      if (src) {
        // Boost score if image has size attributes indicating it's large
        const width = parseInt($img.attr('width') || '0');
        const height = parseInt($img.attr('height') || '0');
        let score = 50;
        
        if (width >= 800 || height >= 600) {
          score = 65; // Large image bonus
        }
        
        // Check for quality indicators in class/id
        const className = $img.attr('class') || '';
        const id = $img.attr('id') || '';
        if (className.match(/featured|hero|main|lead|banner|cover/i) || 
            id.match(/featured|hero|main|lead|banner|cover/i)) {
          score += 10;
        }
        
        candidates.push({
          url: normalizeUrl(src, articleUrl),
          score,
          source: 'article-content-enhanced'
        });
      }
    });

    // Strategy 8: CSS background images (advanced)
    $('[style*="background-image"], .bg-image, .background-image, [class*="bg-"]').slice(0, 5).each((_, elem) => {
      const style = $(elem).attr('style') || '';
      const match = style.match(/background-image:\s*url\(['"]?([^'"()]+)['"]?\)/i);
      if (match && match[1]) {
        candidates.push({
          url: normalizeUrl(match[1], articleUrl),
          score: 55,
          source: 'css-background'
        });
      }
    });

    // Strategy 9: Amp-img elements (for AMP pages)
    $('amp-img').each((_, elem) => {
      const src = $(elem).attr('src');
      if (src) {
        candidates.push({
          url: normalizeUrl(src, articleUrl),
          score: 75,
          source: 'amp-img'
        });
      }
    });

    // Strategy 10: Noscript fallback images (often high quality)
    $('noscript').each((_, elem) => {
      const html = $(elem).html() || '';
      const $noscript = load(html);
      const src = $noscript('img').first().attr('src');
      if (src) {
        candidates.push({
          url: normalizeUrl(src, articleUrl),
          score: 65,
          source: 'noscript-fallback'
        });
      }
    });

    // Strategy 11: First image in article content
    $('article img, main img, .article-content img, .post-content img, .entry-content img').slice(0, 3).each((_, elem) => {
      const $img = $(elem);
      const srcsetCandidate = pickBestFromSrcset(
        $img.attr('data-srcset') || $img.attr('srcset'),
        articleUrl
      );
      const rawSrc = $img.attr('src') || $img.attr('data-src');
      const src = srcsetCandidate || (rawSrc && !isDataUri(rawSrc) ? normalizeUrl(rawSrc, articleUrl) : null);
      if (src) {
        candidates.push({
          url: normalizeUrl(src, articleUrl),
          score: 45, // Lower score since already handled in Strategy 7
          source: 'article-content-simple'
        });
      }
    });

    // Strategy 12: Link rel image
    const linkImage = $('link[rel="image_src"]').attr('href');
    if (linkImage) {
      candidates.push({
        url: normalizeUrl(linkImage, articleUrl),
        score: 60,
        source: 'link-rel'
      });
    }

    // De-duplicate URLs and re-score for editorial relevance.
    const uniqueCandidates: ImageCandidate[] = [];
    const seen = new Set<string>();
    for (const candidate of candidates) {
      if (!candidate.url) continue;
      const normalizedUrl = normalizeUrl(candidate.url, articleUrl);
      if (seen.has(normalizedUrl)) continue;
      seen.add(normalizedUrl);
      uniqueCandidates.push({
        ...candidate,
        url: normalizedUrl,
        score: scoreCandidateForEditorialUse(candidate, articleUrl),
      });
    }

    // Sort candidates by adjusted score
    uniqueCandidates.sort((a, b) => b.score - a.score);

    // Try each candidate until we find a valid one
    for (const candidate of uniqueCandidates) {
      console.log(`[ImageScraper] Testing candidate: ${candidate.url.slice(0, 60)}... (source: ${candidate.source}, score: ${candidate.score})`);

      // Apply domain-specific blacklist
      if (isBlacklistedImage(candidate.url, domainProfile)) {
        console.log(`[ImageScraper] ✗ Blacklisted by domain profile: ${candidate.url.slice(0, 60)}...`);
        continue;
      }

      // Apply domain-specific URL transformation (get high-res version)
      const transformedUrl = transformImageUrl(candidate.url, domainProfile);
      if (transformedUrl !== candidate.url) {
        console.log(`[ImageScraper] Transformed URL: ${transformedUrl.slice(0, 60)}...`);
      }

      const validation = await validateAndRegisterImage(transformedUrl);
      
      if (validation.isValid) {
        console.log(`[ImageScraper] ✓ Found valid image from ${candidate.source}`);
        return transformedUrl;
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

function extractArxivId(articleUrl: string): string | null {
  try {
    const parsed = new URL(articleUrl);
    const absMatch = parsed.pathname.match(/\/abs\/([^/?#]+)/i);
    if (absMatch?.[1]) return absMatch[1];

    const pdfMatch = parsed.pathname.match(/\/pdf\/([^/?#]+?)(?:\.pdf)?$/i);
    if (pdfMatch?.[1]) return pdfMatch[1];
  } catch {
    // ignore
  }
  return null;
}

function isLikelyArxivFigureUrl(url: string): boolean {
  const lower = url.toLowerCase();
  const blockedPatterns: RegExp[] = [
    /logo/,
    /icon/,
    /social/,
    /license/,
    /creativecommons/,
    /legend/,
    /badge/,
  ];
  return !blockedPatterns.some((pattern) => pattern.test(lower));
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function isRedditPostUrl(url: string): boolean {
  const host = getHostname(url);
  return host === 'reddit.com' || host === 'old.reddit.com' || host === 'new.reddit.com';
}

function extractRedditPostId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/comments\/([a-z0-9]+)/i);
    return match?.[1] ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

async function fetchRedditPostData(articleUrl: string): Promise<Record<string, unknown> | null> {
  const canonical = articleUrl.replace(/\?.*$/, '').replace(/\/$/, '');
  const postId = extractRedditPostId(articleUrl);
  const endpoints: string[] = [];

  if (postId) {
    endpoints.push(`https://www.reddit.com/by_id/t3_${postId}.json?raw_json=1`);
  }
  endpoints.push(canonical.endsWith('.json') ? canonical : `${canonical}.json?raw_json=1`);

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'User-Agent':
            'ThotNetCore/1.0 (https://thotnet-core.vercel.app)',
          Accept: 'application/json,text/plain,*/*',
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) continue;

      const payload = await response.json();

      // by_id endpoint shape
      const byIdPost = payload?.data?.children?.[0]?.data;
      if (byIdPost && typeof byIdPost === 'object') {
        return byIdPost as Record<string, unknown>;
      }

      // comments listing shape
      const listing = Array.isArray(payload) ? payload[0] : payload;
      const listingPost = listing?.data?.children?.[0]?.data;
      if (listingPost && typeof listingPost === 'object') {
        return listingPost as Record<string, unknown>;
      }
    } catch {
      // try next endpoint
    }
  }

  return null;
}

async function extractRedditPostImage(articleUrl: string): Promise<string | null> {
  if (!isRedditPostUrl(articleUrl)) return null;

  try {
    const post = await fetchRedditPostData(articleUrl);
    if (!post) return null;

    const candidates: string[] = [];

    const urlOverriddenByDest = post.url_overridden_by_dest;
    if (typeof urlOverriddenByDest === 'string') {
      candidates.push(urlOverriddenByDest);
    }

    const previewSource = (post.preview as { images?: Array<{ source?: { url?: string } }> } | undefined)
      ?.images?.[0]?.source?.url;
    if (typeof previewSource === 'string') {
      candidates.push(previewSource);
    }

    const thumbnail = post.thumbnail;
    if (typeof thumbnail === 'string' && /^https?:\/\//i.test(thumbnail)) {
      candidates.push(thumbnail);
    }

    const galleryData = post.gallery_data as { items?: Array<{ media_id?: string }> } | undefined;
    const mediaMetadata = post.media_metadata as Record<string, { s?: { u?: string } }> | undefined;
    if (galleryData?.items && mediaMetadata) {
      const galleryItems = Array.isArray(galleryData.items) ? galleryData.items : [];
      for (const item of galleryItems) {
        const mediaId = item?.media_id;
        if (!mediaId) continue;
        const media = mediaMetadata[mediaId];
        const sourceUrl = media?.s?.u;
        if (typeof sourceUrl === 'string') {
          candidates.push(sourceUrl);
        }
      }
    }

    for (const raw of candidates) {
      if (!raw || raw.startsWith('data:')) continue;
      const decoded = decodeHtmlEntities(raw);
      if (decoded.startsWith('//')) {
        return `https:${decoded}`;
      }
      if (/^https?:\/\//i.test(decoded)) {
        return decoded;
      }
    }
  } catch (error) {
    console.warn('[ImageScraper] Reddit image extraction failed:', error);
  }

  return null;
}

async function extractArxivFigureImage(articleUrl: string): Promise<string | null> {
  const host = getHostname(articleUrl);
  if (host !== 'arxiv.org') return null;

  try {
    const absUrl = articleUrl.includes('/abs/')
      ? articleUrl
      : (() => {
          const id = extractArxivId(articleUrl);
          return id ? `https://arxiv.org/abs/${id}` : articleUrl;
        })();

    const absResponse = await fetch(absUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!absResponse.ok) return null;

    const absHtml = await absResponse.text();
    const $abs = load(absHtml);

    let htmlPath =
      $abs('a[href*="/html/"]').toArray()
        .map((el) => $abs(el).attr('href'))
        .find((href) => typeof href === 'string' && /\/html\/[^/?#]+/i.test(href || '')) || null;

    if (!htmlPath) {
      const arxivId = extractArxivId(absUrl);
      if (!arxivId) return null;
      const withVersion = /v\d+$/i.test(arxivId) ? arxivId : `${arxivId}v1`;
      htmlPath = `/html/${withVersion}`;
    }

    const htmlUrl = normalizeUrl(htmlPath, 'https://arxiv.org');
    const htmlResponse = await fetch(htmlUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!htmlResponse.ok) return null;

    const html = await htmlResponse.text();
    const $ = load(html);

    const candidateSelectors = [
      'figure img[src]',
      '.ltx_figure img[src]',
      '.ltx_graphics[src]',
      'img[src*="/figures/"]',
      'img[src*="figures/"]',
    ];

    for (const selector of candidateSelectors) {
      const nodes = $(selector).toArray();
      for (const node of nodes) {
        const raw = $(node).attr('src');
        if (!raw || raw.startsWith('data:')) continue;
        const absolute = normalizeUrl(raw, htmlUrl);
        if (!isLikelyArxivFigureUrl(absolute)) continue;
        return absolute;
      }
    }
  } catch (error) {
    console.warn('[ImageScraper] ArXiv figure extraction failed:', error);
  }

  return null;
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
  'itunes:image'?: { $?: { href?: string } } | { href?: string };
}): string | null {
  // Strategy 1: Media content
  if (item['media:content']?.$?.url) {
    return item['media:content'].$.url;
  }

  // Strategy 2: Media thumbnail
  if (item['media:thumbnail']?.$?.url) {
    return item['media:thumbnail'].$.url;
  }

  // Strategy 2.5: iTunes podcast artwork
  const itunesImage = item['itunes:image'] as { $?: { href?: string } } | { href?: string } | undefined;
  const itunesHref = itunesImage
    ? typeof (itunesImage as { href?: string }).href === 'string'
      ? (itunesImage as { href?: string }).href
      : typeof (itunesImage as { $?: { href?: string } }).$?.href === 'string'
        ? (itunesImage as { $?: { href?: string } }).$?.href
        : undefined
    : undefined;
  if (itunesHref) {
    return itunesHref;
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
    'media:content'?: { $?: { url?: string } };
    'media:thumbnail'?: { $?: { url?: string } };
    'itunes:image'?: { $?: { href?: string } } | { href?: string };
  },
  options: {
    skipRegister?: boolean;
    skipCache?: boolean;
    skipDuplicateCheck?: boolean;
  } = {}
): Promise<string | null> {
  // Strategy 0: Check if URL itself is an oEmbed-supported embed (Twitter, YouTube, etc.)
  if (isOEmbedUrl(articleUrl)) {
    console.log('[ImageScraper] Article URL is oEmbed-supported, trying oEmbed API...');
    const oembedResult = await getOEmbedImage(articleUrl);
    if (oembedResult.imageUrl) {
      const validation = await validateAndRegisterImage(oembedResult.imageUrl, options);
      if (validation.isValid) {
        console.log(`[ImageScraper] ✓ Valid image from oEmbed (${oembedResult.provider})`);
        return oembedResult.imageUrl;
      }
    }
  }

  // Strategy 0.5: ArXiv-specific figure extraction (original paper figure, not site logo)
  if (getHostname(articleUrl) === 'arxiv.org') {
    const arxivFigure = await extractArxivFigureImage(articleUrl);
    if (arxivFigure) {
      const validation = await validateAndRegisterImage(arxivFigure, options);
      if (validation.isValid) {
        console.log('[ImageScraper] ✓ Valid image from arXiv HTML figure');
        return arxivFigure;
      }
      console.log(`[ImageScraper] ArXiv figure invalid: ${validation.error}`);
    }
  }

  // Strategy 0.6: Reddit post media extraction (original media from post JSON)
  if (isRedditPostUrl(articleUrl)) {
    const redditImage = await extractRedditPostImage(articleUrl);
    if (redditImage) {
      const validation = await validateAndRegisterImage(redditImage, options);
      if (validation.isValid) {
        console.log('[ImageScraper] ✓ Valid image from Reddit post media');
        return redditImage;
      }
      console.log(`[ImageScraper] Reddit media invalid: ${validation.error}`);
    }
  }

  // Strategy 1: Try RSS extraction first (fast)
  if (rssItem) {
    const rssImage = extractImageFromRSS(rssItem);
    if (rssImage) {
      const validation = await validateAndRegisterImage(rssImage, options);
      if (validation.isValid) {
        console.log('[ImageScraper] ✓ Valid image from RSS feed');
        return rssImage;
      }
      console.log(`[ImageScraper] RSS image invalid: ${validation.error}`);
    }
    
    // Strategy 1.5: Try extracting oEmbed URLs from RSS content
    if (rssItem.content || rssItem.contentSnippet) {
      const content = rssItem.content || rssItem.contentSnippet || '';
      const oembedImages = await getOEmbedImagesFromContent(content);
      
      for (const imageUrl of oembedImages) {
        const validation = await validateAndRegisterImage(imageUrl, options);
        if (validation.isValid) {
          console.log('[ImageScraper] ✓ Valid image from oEmbed in RSS content');
          return imageUrl;
        }
      }
    }
  }

  // Strategy 2: Fallback to scraping article page
  const scrapedUrl = await scrapeArticleImage(articleUrl);
  if (!scrapedUrl) {
    return null;
  }

  const validation = await validateAndRegisterImage(scrapedUrl, options);
  if (validation.isValid) {
    return scrapedUrl;
  }

  console.log(`[ImageScraper] Scraped image invalid: ${validation.error}`);
  return null;
}
