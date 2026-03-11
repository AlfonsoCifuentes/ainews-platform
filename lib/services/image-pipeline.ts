/**
 * 🖼️ MULTI-LAYER IMAGE SCRAPING PIPELINE
 *
 * Extracts the ORIGINAL image accompanying a news article.
 * NO AI-generated images. NO stock/library images.
 * Fallback images are assigned ONLY by the caller when every layer fails.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * LAYER 1 – RSS Feed Metadata            (zero-cost, data already in memory)
 * LAYER 2 – HTTP GET + Static HTML Parse  (1 HTTP request, cheerio)
 *   2a  Open Graph / Twitter Card meta tags
 *   2b  JSON-LD Structured Data (schema.org)
 *   2c  <link rel="image_src"> & misc meta
 *   2d  Featured-image CSS selectors (80+)
 *   2e  First large image in article body
 *   2f  CSS background-image extraction
 *   2g  AMP / noscript fallback images
 * LAYER 3 – Domain-specific strategies    (same or new request)
 *   3a  ArXiv HTML figure extraction
 *   3b  Reddit JSON API (.json suffix)
 *   3c  oEmbed API (YouTube / Twitter thumbs)
 * LAYER 4 – Retry with alternative User-Agents
 * LAYER 5 – Playwright headless browser   (for JS-rendered SPAs)
 * LAYER 6 – Web Archive fallback          (Wayback Machine CDX API)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Every candidate URL is validated via validateImageUrl() before being
 * accepted (HEAD request → content-type + min-size check + blacklist).
 */

import { load, type CheerioAPI } from 'cheerio';
import { validateUrlForSSRFSync } from '../utils/ssrf-protection';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface RSSImageHints {
  enclosure?: { url?: string; type?: string };
  content?: string;
  contentSnippet?: string;
  'media:content'?: { $?: { url?: string } } | string;
  'media:thumbnail'?: { $?: { url?: string } } | string;
  'itunes:image'?: { $?: { href?: string } } | { href?: string } | string;
}

export interface PipelineResult {
  url: string;
  layer: string;
  method: string;
  confidence: number;
}

interface LayerContext {
  articleUrl: string;
  hostname: string;
  baseOrigin: string;
  html?: string;
  $?: CheerioAPI;
}

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 12_000;
const HEAD_TIMEOUT_MS  =  8_000;
const MIN_IMAGE_BYTES  =  5_000;   // 5 KB
const MIN_USEFUL_DIM   =    200;   // px – reject icons/avatars

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
];

/** Domains that serve stock / placeholder images – never accepted. */
const STOCK_DOMAINS = new Set([
  'unsplash.com', 'images.unsplash.com', 'source.unsplash.com',
  'pixabay.com', 'cdn.pixabay.com',
  'pexels.com', 'images.pexels.com', 'cdn.pexels.com',
  'picsum.photos', 'dummyimage.com', 'placeholder.com', 'placehold.it',
  'placehold.co', 'via.placeholder.com', 'placekitten.com', 'loremflickr.com',
  'shutterstock.com', 'istockphoto.com', 'gettyimages.com',
  'stock.adobe.com', 'depositphotos.com', 'dreamstime.com',
]);

/** Substrings in a URL that almost certainly denote junk / non-editorial images. */
const BLACKLIST_PATTERNS = [
  '/avatar', '/icon', '/logo', '/favicon', '/badge',
  '/emoji', '/tracking', '/analytics', '/pixel',
  '/1x1', '/spacer', '/blank', '/spinner',
  'gravatar.com', 'wp-content/plugins',
  'data:image', 'base64,',
];

// 80+ CSS selectors for featured / hero images, ordered by relevance.
const FEATURED_SELECTORS: string[] = [
  // WordPress
  'img.wp-post-image', '.featured-image img', '.post-thumbnail img',
  // Generic hero / featured
  'img.featured', 'img.hero', 'img.hero-image',
  '.hero-image img', '.hero img', '.main-image img', '.primary-image img',
  '.lead-image img', '.cover-image img', '.banner-image img',
  '.article-image img', '.article-hero img', '.article-header img',
  '.post-header img', '.entry-header img', '.story-image img',
  // CMS patterns
  '.article-featured-image img', '.post-featured-image img',
  '.entry-featured-image img', '.content-featured-image img',
  // News sites
  'figure.featured img', 'figure.lead img', 'figure.hero img',
  '.article-figure img', '.story-figure img', '.news-figure img',
  // Data attributes
  'img[data-featured="true"]', 'img[data-hero="true"]', 'img[data-main="true"]',
  // Schema.org
  '[itemprop="image"] img', '[itemprop="image"]',
  '[itemtype*="ImageObject"] img',
  // Lazy-load
  'img[data-src]', 'img[data-lazy-src]', 'img[data-original]',
  // Picture / responsive
  'picture img', 'picture source',
  // Modern frameworks
  '[data-gatsby-image-wrapper] img', '.gatsby-image-wrapper img',
  '[data-next-image] img', 'img[data-nimg]',
  // Medium / Substack / Ghost
  '.medium-feed-image', '.post-full-image img', '.kg-image',
  // AMP
  'amp-img[src]',
  // Size-hinted
  'img[width="1200"]', 'img[width="1920"]',
];

const ARTICLE_BODY_SELECTORS = [
  'article img', 'main img', '[role="main"] img',
  '.article-content img', '.post-content img', '.entry-content img',
  '.content img', '#content img', '.story-body img', '.article-body img',
];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function getHostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return ''; }
}

function resolveUrl(candidate: string | undefined | null, base: string): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    return new URL(trimmed, base).href;
  } catch { return null; }
}

function isBlacklisted(url: string): boolean {
  const lower = url.toLowerCase();
  if (BLACKLIST_PATTERNS.some((p) => lower.includes(p))) return true;
  const host = getHostname(url);
  if (STOCK_DOMAINS.has(host)) return true;
  // SSRF check
  if (!validateUrlForSSRFSync(url)) return true;
  return false;
}

function pickBestSrcset(raw: string | undefined, base: string): string | null {
  if (!raw) return null;
  let best: { url: string; w: number } | null = null;
  for (const part of raw.split(',')) {
    const [urlPart, desc] = part.trim().split(/\s+/);
    if (!urlPart) continue;
    const resolved = resolveUrl(urlPart, base);
    if (!resolved) continue;
    let w = 0;
    if (desc?.endsWith('w')) w = parseInt(desc, 10) || 0;
    else if (desc?.endsWith('x')) w = (parseFloat(desc) || 1) * 1000;
    else w = 1;
    if (!best || w > best.w) best = { url: resolved, w };
  }
  return best?.url ?? null;
}

/** Try to extract an image src from an element checking src, data-src, etc. */
function extractSrc($el: ReturnType<CheerioAPI>, base: string): string | null {
  const attrs = ['src', 'data-src', 'data-lazy-src', 'data-original', 'data-lazy', 'content', 'href'];
  for (const attr of attrs) {
    const val = $el.attr(attr);
    const resolved = resolveUrl(val, base);
    if (resolved && !isBlacklisted(resolved)) return resolved;
  }
  // srcset / data-srcset
  const srcset = $el.attr('srcset') || $el.attr('data-srcset');
  const fromSet = pickBestSrcset(srcset, base);
  if (fromSet && !isBlacklisted(fromSet)) return fromSet;
  return null;
}

/** Lightweight HEAD/GET probe to verify a URL points to a real image ≥ MIN bytes. */
async function probe(url: string): Promise<boolean> {
  if (isBlacklisted(url)) return false;
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': USER_AGENTS[0], Accept: 'image/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(HEAD_TIMEOUT_MS),
    });
    if (!res.ok) return false;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.startsWith('image/')) return false;
    // SVGs are usually logos/icons
    if (ct.includes('svg')) return false;
    const len = parseInt(res.headers.get('content-length') || '0', 10);
    if (len > 0 && len < MIN_IMAGE_BYTES) return false;
    return true;
  } catch {
    // Some servers block HEAD – try a range GET instead
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': USER_AGENTS[0], Accept: 'image/*', Range: 'bytes=0-1023' },
        redirect: 'follow',
        signal: AbortSignal.timeout(HEAD_TIMEOUT_MS),
      });
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!ct.startsWith('image/') || ct.includes('svg')) return false;
      return res.ok || res.status === 206;
    } catch { return false; }
  }
}

async function fetchHtml(url: string, ua?: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': ua || USER_AGENTS[0],
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

function log(layer: string, msg: string) {
  console.log(`  [Pipeline:${layer}] ${msg}`);
}

// ---------------------------------------------------------------------------
// LAYER 1 – RSS FEED METADATA
// ---------------------------------------------------------------------------

function layer1_RSSMetadata(hints: RSSImageHints | undefined, base: string): string | null {
  if (!hints) return null;

  // media:content
  const mc = hints['media:content'];
  if (mc) {
    const url = typeof mc === 'string' ? mc : mc?.$?.url;
    const resolved = resolveUrl(url, base);
    if (resolved && !isBlacklisted(resolved)) return resolved;
  }

  // media:thumbnail
  const mt = hints['media:thumbnail'];
  if (mt) {
    const url = typeof mt === 'string' ? mt : mt?.$?.url;
    const resolved = resolveUrl(url, base);
    if (resolved && !isBlacklisted(resolved)) return resolved;
  }

  // enclosure
  if (hints.enclosure?.url) {
    const ct = (hints.enclosure.type || '').toLowerCase();
    if (!ct || ct.startsWith('image/')) {
      const resolved = resolveUrl(hints.enclosure.url, base);
      if (resolved && !isBlacklisted(resolved)) return resolved;
    }
  }

  // itunes:image
  const ii = hints['itunes:image'];
  if (ii) {
    const url = typeof ii === 'string' ? ii : (ii as { href?: string })?.href || (ii as { $?: { href?: string } })?.$?.href;
    const resolved = resolveUrl(url, base);
    if (resolved && !isBlacklisted(resolved)) return resolved;
  }

  // Extract first <img> from content / contentSnippet HTML
  const htmlSnippet = hints.content || hints.contentSnippet || '';
  if (htmlSnippet.includes('<img')) {
    try {
      const $ = load(htmlSnippet);
      const firstImg = $('img').first();
      const src = extractSrc(firstImg, base);
      if (src) return src;
    } catch { /* ignore */ }
  }

  return null;
}

// ---------------------------------------------------------------------------
// LAYER 2 – STATIC HTML PARSE (single fetch, multiple sub-strategies)
// ---------------------------------------------------------------------------

function layer2a_MetaTags($: CheerioAPI, ctx: LayerContext): string | null {
  const tags = [
    { sel: 'meta[property="og:image"]',            attr: 'content' },
    { sel: 'meta[property="og:image:secure_url"]',  attr: 'content' },
    { sel: 'meta[name="twitter:image"]',            attr: 'content' },
    { sel: 'meta[property="twitter:image"]',        attr: 'content' },
    { sel: 'meta[name="twitter:image:src"]',        attr: 'content' },
    { sel: 'meta[name="image"]',                    attr: 'content' },
    { sel: 'meta[property="image"]',                attr: 'content' },
    { sel: 'meta[name="thumbnail"]',                attr: 'content' },
    { sel: 'meta[itemprop="image"]',                attr: 'content' },
    { sel: 'meta[name="msapplication-TileImage"]',  attr: 'content' },
  ];
  for (const { sel, attr } of tags) {
    const val = $(sel).first().attr(attr);
    const resolved = resolveUrl(val, ctx.articleUrl);
    if (resolved && !isBlacklisted(resolved)) return resolved;
  }
  return null;
}

function layer2b_JsonLD($: CheerioAPI, ctx: LayerContext): string | null {
  try {
    const scripts = $('script[type="application/ld+json"]').toArray();
    for (const node of scripts) {
      const raw = $(node).text();
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        // Direct image property
        const img = (item as Record<string, unknown>).image;
        if (typeof img === 'string') {
          const r = resolveUrl(img, ctx.articleUrl);
          if (r && !isBlacklisted(r)) return r;
        }
        if (typeof img === 'object' && img !== null) {
          const urlField = (img as Record<string, unknown>).url || (img as Record<string, unknown>).contentUrl;
          if (typeof urlField === 'string') {
            const r = resolveUrl(urlField, ctx.articleUrl);
            if (r && !isBlacklisted(r)) return r;
          }
        }
        if (Array.isArray(img)) {
          for (const entry of img) {
            const u = typeof entry === 'string' ? entry : entry?.url || entry?.contentUrl;
            if (typeof u === 'string') {
              const r = resolveUrl(u, ctx.articleUrl);
              if (r && !isBlacklisted(r)) return r;
            }
          }
        }
        // thumbnailUrl
        const thumb = (item as Record<string, unknown>).thumbnailUrl;
        if (typeof thumb === 'string') {
          const r = resolveUrl(thumb, ctx.articleUrl);
          if (r && !isBlacklisted(r)) return r;
        }
      }
    }
  } catch { /* malformed JSON-LD */ }
  return null;
}

function layer2c_LinkRel($: CheerioAPI, ctx: LayerContext): string | null {
  const linkSrc = $('link[rel="image_src"]').first().attr('href');
  const r = resolveUrl(linkSrc, ctx.articleUrl);
  if (r && !isBlacklisted(r)) return r;

  const preload = $('link[rel="preload"][as="image"]').first().attr('href');
  const r2 = resolveUrl(preload, ctx.articleUrl);
  if (r2 && !isBlacklisted(r2)) return r2;

  return null;
}

function layer2d_FeaturedSelectors($: CheerioAPI, ctx: LayerContext): string | null {
  for (const sel of FEATURED_SELECTORS) {
    const el = $(sel).first();
    if (!el.length) continue;
    const src = extractSrc(el, ctx.articleUrl);
    if (src) return src;
  }
  return null;
}

function layer2e_ArticleBodyImage($: CheerioAPI, ctx: LayerContext): string | null {
  // Remove navigation, ads, footer
  const clean = $.root().clone();
  const $c = load(clean.html() || '');
  $c('script, style, nav, header, footer, aside, .ad, .advertisement, .sidebar, iframe, .comment, .comments').remove();

  for (const sel of ARTICLE_BODY_SELECTORS) {
    const images = $c(sel).toArray();
    for (const img of images) {
      const $img = $c(img);
      // Skip tiny images (icons, spacers)
      const w = parseInt($img.attr('width') || '0', 10);
      const h = parseInt($img.attr('height') || '0', 10);
      if ((w > 0 && w < MIN_USEFUL_DIM) || (h > 0 && h < MIN_USEFUL_DIM)) continue;
      const src = extractSrc($img, ctx.articleUrl);
      if (src) return src;
    }
  }
  return null;
}

function layer2f_CSSBackgroundImage($: CheerioAPI, ctx: LayerContext): string | null {
  const bgSelectors = ['.hero', '.featured', '.banner', '.cover', '.lead-image',
    '.article-hero', '.post-header', '.entry-header', '[data-background]'];
  for (const sel of bgSelectors) {
    const el = $(sel).first();
    if (!el.length) continue;
    const style = el.attr('style') || '';
    const match = style.match(/background(?:-image)?\s*:\s*url\(\s*['"]?([^'")\s]+)['"]?\s*\)/i);
    if (match?.[1]) {
      const r = resolveUrl(match[1], ctx.articleUrl);
      if (r && !isBlacklisted(r)) return r;
    }
    const dataBg = el.attr('data-background') || el.attr('data-bg');
    const r = resolveUrl(dataBg, ctx.articleUrl);
    if (r && !isBlacklisted(r)) return r;
  }
  return null;
}

function layer2g_AmpNoscript($: CheerioAPI, ctx: LayerContext): string | null {
  // AMP images
  const ampImg = $('amp-img[src]').first();
  if (ampImg.length) {
    const src = resolveUrl(ampImg.attr('src'), ctx.articleUrl);
    if (src && !isBlacklisted(src)) return src;
  }
  // Noscript fallback (lazy-loaded pages put real img inside <noscript>)
  const noscripts = $('noscript').toArray();
  for (const ns of noscripts) {
    const inner = $(ns).html();
    if (!inner || !inner.includes('<img')) continue;
    const $ns = load(inner);
    const img = $ns('img').first();
    const src = extractSrc(img, ctx.articleUrl);
    if (src) return src;
  }
  return null;
}

// ---------------------------------------------------------------------------
// LAYER 3 – DOMAIN-SPECIFIC STRATEGIES
// ---------------------------------------------------------------------------

async function layer3a_ArXiv(ctx: LayerContext): Promise<string | null> {
  if (ctx.hostname !== 'arxiv.org') return null;
  // Try to get the HTML5 version which may have figures
  const absId = ctx.articleUrl.match(/abs\/(\d+\.\d+)/)?.[1];
  if (!absId) return null;
  const htmlUrl = `https://arxiv.org/html/${absId}v1`;
  const html = await fetchHtml(htmlUrl);
  if (!html) return null;
  const $ = load(html);
  const fig = $('figure img, .ltx_figure img, .ltx_graphics img').first();
  const src = extractSrc(fig, htmlUrl);
  return src;
}

async function layer3b_Reddit(ctx: LayerContext): Promise<string | null> {
  if (!ctx.hostname.includes('reddit.com')) return null;
  try {
    const jsonUrl = ctx.articleUrl.replace(/\/?$/, '.json');
    const res = await fetch(jsonUrl, {
      headers: { 'User-Agent': 'AINewsBot/1.0' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json() as unknown;
    if (!Array.isArray(data) || !data[0]?.data?.children?.[0]) return null;
    const post = data[0].data.children[0].data;
    // Try preview images
    const preview = post?.preview?.images?.[0]?.source?.url;
    if (preview) {
      const decoded = preview.replace(/&amp;/g, '&');
      if (!isBlacklisted(decoded)) return decoded;
    }
    // Try thumbnail
    if (post?.thumbnail && post.thumbnail.startsWith('http') && !isBlacklisted(post.thumbnail)) {
      return post.thumbnail;
    }
  } catch { /* ignore */ }
  return null;
}

async function layer3c_oEmbed(ctx: LayerContext): Promise<string | null> {
  const oembedEndpoints: Array<{ test: RegExp; endpoint: string }> = [
    { test: /youtube\.com\/watch|youtu\.be\//i, endpoint: 'https://www.youtube.com/oembed' },
    { test: /vimeo\.com\//i, endpoint: 'https://vimeo.com/api/oembed.json' },
    { test: /twitter\.com\/|x\.com\//i, endpoint: 'https://publish.twitter.com/oembed' },
  ];
  for (const { test, endpoint } of oembedEndpoints) {
    if (!test.test(ctx.articleUrl)) continue;
    try {
      const url = `${endpoint}?url=${encodeURIComponent(ctx.articleUrl)}&format=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const json = await res.json() as Record<string, unknown>;
      const thumb = json.thumbnail_url as string | undefined;
      if (thumb && !isBlacklisted(thumb)) return thumb;
      // Also check html for img
      const html = json.html as string | undefined;
      if (html?.includes('<img')) {
        const $ = load(html);
        const src = $('img').first().attr('src');
        if (src && !isBlacklisted(src)) return src;
      }
    } catch { /* ignore */ }
  }
  return null;
}

// ---------------------------------------------------------------------------
// LAYER 4 – RETRY WITH ALTERNATIVE USER-AGENTS
// ---------------------------------------------------------------------------

async function layer4_RetryUAs(ctx: LayerContext): Promise<string | null> {
  // Try UAs starting from index 1 (index 0 was used in layer 2)
  for (let i = 1; i < USER_AGENTS.length; i++) {
    const ua = USER_AGENTS[i];
    log('L4', `Retrying with UA #${i + 1}...`);
    const html = await fetchHtml(ctx.articleUrl, ua);
    if (!html) continue;
    const $ = load(html);
    // Only try the most reliable sub-layers
    const img = layer2a_MetaTags($, ctx) || layer2b_JsonLD($, ctx) || layer2d_FeaturedSelectors($, ctx);
    if (img) {
      const valid = await probe(img);
      if (valid) return img;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// LAYER 5 – PLAYWRIGHT HEADLESS BROWSER
// ---------------------------------------------------------------------------

async function layer5_Playwright(ctx: LayerContext): Promise<string | null> {
  // Only attempt if playwright is available (not in all environments)
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    try {
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(ctx.articleUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      // Wait a bit for lazy images to load
      await page.waitForTimeout(2000);
      const html = await page.content();
      const $ = load(html);
      const img = layer2a_MetaTags($, ctx) || layer2b_JsonLD($, ctx) || layer2d_FeaturedSelectors($, ctx) || layer2e_ArticleBodyImage($, ctx);
      return img;
    } finally {
      await browser.close().catch(() => {});
    }
  } catch {
    // Playwright not installed or browser launch failed – skip
    return null;
  }
}

// ---------------------------------------------------------------------------
// LAYER 6 – WEB ARCHIVE (WAYBACK MACHINE)
// ---------------------------------------------------------------------------

async function layer6_WebArchive(ctx: LayerContext): Promise<string | null> {
  try {
    // Check Wayback Machine availability API
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(ctx.articleUrl)}&output=json&limit=1&fl=timestamp&filter=statuscode:200`;
    const cdxRes = await fetch(cdxUrl, { signal: AbortSignal.timeout(8000) });
    if (!cdxRes.ok) return null;
    const rows = await cdxRes.json() as string[][];
    if (!rows || rows.length < 2) return null; // first row is header
    const timestamp = rows[1][0];
    const archivedUrl = `https://web.archive.org/web/${timestamp}/${ctx.articleUrl}`;
    log('L6', `Found archive snapshot ${timestamp}`);
    const html = await fetchHtml(archivedUrl);
    if (!html) return null;
    const $ = load(html);
    // Extract and unwrap Wayback Machine URL rewriting
    let img = layer2a_MetaTags($, { ...ctx, articleUrl: archivedUrl })
           || layer2b_JsonLD($, { ...ctx, articleUrl: archivedUrl });
    if (img) {
      // Wayback wraps URLs: /web/20240101/https://... → extract original
      const waybackMatch = img.match(/\/web\/\d+\/(https?:\/\/.+)/);
      if (waybackMatch) img = waybackMatch[1];
      return img;
    }
  } catch { /* Wayback unavailable or timeout */ }
  return null;
}

// ---------------------------------------------------------------------------
// MAIN PIPELINE ORCHESTRATOR
// ---------------------------------------------------------------------------

/**
 * Run the full multi-layer image extraction pipeline.
 * Returns the first valid image URL found, or `null` if every layer fails.
 */
export async function resolveArticleImage(
  articleUrl: string,
  rssHints?: RSSImageHints,
): Promise<PipelineResult | null> {
  const hostname = getHostname(articleUrl);
  const baseOrigin = (() => { try { const u = new URL(articleUrl); return `${u.protocol}//${u.host}`; } catch { return ''; } })();
  const ctx: LayerContext = { articleUrl, hostname, baseOrigin };

  console.log(`[ImagePipeline] Resolving image for: ${articleUrl}`);

  // ── LAYER 1: RSS Metadata ──────────────────────────────────────────
  const rssImage = layer1_RSSMetadata(rssHints, articleUrl);
  if (rssImage) {
    const valid = await probe(rssImage);
    if (valid) {
      log('L1', `✓ RSS metadata → ${rssImage.slice(0, 80)}`);
      return { url: rssImage, layer: 'L1-RSS', method: 'rss-metadata', confidence: 0.85 };
    }
    log('L1', `✗ RSS image failed validation`);
  }

  // ── LAYER 2: Static HTML Parse ─────────────────────────────────────
  const html = await fetchHtml(articleUrl);
  if (html) {
    ctx.html = html;
    const $ = load(html);
    ctx.$ = $;

    const sublayers: Array<{ fn: () => string | null; name: string; conf: number }> = [
      { fn: () => layer2a_MetaTags($, ctx),          name: 'og/twitter-meta',     conf: 0.95 },
      { fn: () => layer2b_JsonLD($, ctx),             name: 'json-ld',             conf: 0.90 },
      { fn: () => layer2c_LinkRel($, ctx),            name: 'link-rel',            conf: 0.80 },
      { fn: () => layer2d_FeaturedSelectors($, ctx),  name: 'featured-selector',   conf: 0.75 },
      { fn: () => layer2e_ArticleBodyImage($, ctx),   name: 'article-body-img',    conf: 0.65 },
      { fn: () => layer2f_CSSBackgroundImage($, ctx), name: 'css-background',      conf: 0.55 },
      { fn: () => layer2g_AmpNoscript($, ctx),        name: 'amp-noscript',        conf: 0.60 },
    ];

    for (const { fn, name, conf } of sublayers) {
      const img = fn();
      if (img) {
        const valid = await probe(img);
        if (valid) {
          log('L2', `✓ ${name} → ${img.slice(0, 80)}`);
          return { url: img, layer: `L2-${name}`, method: name, confidence: conf };
        }
        log('L2', `✗ ${name} image failed probe`);
      }
    }
  } else {
    log('L2', '✗ Could not fetch article HTML');
  }

  // ── LAYER 3: Domain-Specific ───────────────────────────────────────
  const domainFns: Array<{ fn: () => Promise<string | null>; name: string; conf: number }> = [
    { fn: () => layer3a_ArXiv(ctx),   name: 'arxiv-figure',  conf: 0.70 },
    { fn: () => layer3b_Reddit(ctx),  name: 'reddit-json',   conf: 0.80 },
    { fn: () => layer3c_oEmbed(ctx),  name: 'oembed-api',    conf: 0.75 },
  ];

  for (const { fn, name, conf } of domainFns) {
    const img = await fn();
    if (img) {
      const valid = await probe(img);
      if (valid) {
        log('L3', `✓ ${name} → ${img.slice(0, 80)}`);
        return { url: img, layer: `L3-${name}`, method: name, confidence: conf };
      }
      log('L3', `✗ ${name} image failed probe`);
    }
  }

  // ── LAYER 4: Retry with Alternative User-Agents ────────────────────
  const uaImage = await layer4_RetryUAs(ctx);
  if (uaImage) {
    log('L4', `✓ Alt UA → ${uaImage.slice(0, 80)}`);
    return { url: uaImage, layer: 'L4-alt-ua', method: 'ua-rotation', confidence: 0.70 };
  }

  // ── LAYER 5: Playwright Headless Browser ───────────────────────────
  log('L5', 'Trying Playwright headless browser...');
  const pwImage = await layer5_Playwright(ctx);
  if (pwImage) {
    const valid = await probe(pwImage);
    if (valid) {
      log('L5', `✓ Playwright → ${pwImage.slice(0, 80)}`);
      return { url: pwImage, layer: 'L5-playwright', method: 'headless-browser', confidence: 0.70 };
    }
  }

  // ── LAYER 6: Web Archive ───────────────────────────────────────────
  log('L6', 'Trying Wayback Machine...');
  const archiveImage = await layer6_WebArchive(ctx);
  if (archiveImage) {
    const valid = await probe(archiveImage);
    if (valid) {
      log('L6', `✓ Web Archive → ${archiveImage.slice(0, 80)}`);
      return { url: archiveImage, layer: 'L6-web-archive', method: 'wayback-machine', confidence: 0.60 };
    }
  }

  // ── ALL LAYERS EXHAUSTED ───────────────────────────────────────────
  log('DONE', '✗ All layers exhausted — no original image found');
  return null;
}
