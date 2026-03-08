#!/usr/bin/env tsx

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import pLimit from 'p-limit';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
  loadEnv({ path: envLocal });
} else {
  loadEnv();
}

import { getSupabaseServerClient } from '../lib/db/supabase';
import { getBestArticleImage } from '../lib/services/image-scraper';
import { scrapeArticleImageAdvanced } from '../lib/services/advanced-image-scraper';
import { validateImageEnhanced } from '../lib/services/image-validator';

type NewsRow = {
  id: string;
  title_en: string | null;
  title_es: string | null;
  source_url: string;
  image_url: string | null;
  is_hidden: boolean | null;
  created_at: string;
};

type ResolvedImage = {
  imageUrl: string;
  sourceUrlUsed: string;
  method: string;
};

const EXECUTE = process.argv.includes('--execute');
const ALL = process.argv.includes('--all');
const HIDE_UNRESOLVED = process.argv.includes('--hide-unresolved');
const REQUIRE_TARGET = process.argv.includes('--require-target');
const INCLUDE_HIDDEN = process.argv.includes('--include-hidden');
// --stale: also repair articles whose image URL returns 404/error (not just fallback-like URLs)
const STALE_CHECK = process.argv.includes('--stale');
const STALE_DAYS = Number(
  (process.argv.find((arg) => arg.startsWith('--stale-days='))?.split('=')[1] ?? '30').trim(),
);
const LIMIT = Number(
  (process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] ?? '250').trim(),
);
const PARALLEL = Number(
  (process.argv.find((arg) => arg.startsWith('--parallel='))?.split('=')[1] ?? '3').trim(),
);
const TARGET_RATIO = Number(
  (process.argv.find((arg) => arg.startsWith('--target-ratio='))?.split('=')[1] ?? '0.90').trim(),
);

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const FALLBACK_IMAGE_HOSTS = [
  'source.unsplash.com',
  'images.unsplash.com',
  'unsplash.com',
  'pexels.com',
  'images.pexels.com',
  'pixabay.com',
  'cdn.pixabay.com',
  'picsum.photos',
  'dummyimage.com',
  'placeholder.com',
  'via.placeholder.com',
  'placehold.co',
  'placehold.it',
  'loremflickr.com',
  'lh3.googleusercontent.com',
  'styles.redditmedia.com',
  'redditmedia.com',
];

const FALLBACK_URL_PATTERNS: RegExp[] = [
  /\/news-fallback-images\//i,
  /fallback[_-]/i,
  /placeholder[-_]?ai[-_]?news/i,
  /\/default[-_]?social/i,
  /\/no[-_]?image/i,
  /\/coming[-_]?soon/i,
];

const GOOGLE_NEWS_CACHE = new Map<string, string>();

function getHost(url: string | null | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function rootDomain(host: string): string {
  const clean = host.replace(/^www\./, '').toLowerCase();
  const parts = clean.split('.').filter(Boolean);
  if (parts.length <= 2) return clean;
  return parts.slice(-2).join('.');
}

function isFallbackImageUrl(imageUrl: string | null): boolean {
  if (!imageUrl || !imageUrl.trim()) return true;
  if (imageUrl.startsWith('data:')) return true;

  const lower = imageUrl.toLowerCase();
  const host = getHost(imageUrl);
  if (host && FALLBACK_IMAGE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    return true;
  }

  return FALLBACK_URL_PATTERNS.some((pattern) => pattern.test(lower));
}

function isLikelyPublisherImageHost(imageHost: string, sourceHost: string): boolean {
  if (!imageHost || !sourceHost) return true;

  if (sourceHost === 'reddit.com' || sourceHost.endsWith('.reddit.com')) {
    if (
      imageHost.endsWith('.redd.it') ||
      imageHost === 'redd.it' ||
      imageHost.endsWith('.redditmedia.com') ||
      imageHost === 'redditmedia.com'
    ) {
      return true;
    }
  }

  if (imageHost === sourceHost) return true;
  if (imageHost.endsWith(`.${sourceHost}`) || sourceHost.endsWith(`.${imageHost}`)) return true;
  if (rootDomain(imageHost) === rootDomain(sourceHost)) return true;

  // Allow common CDN/image subdomains used by publishers.
  const cdnHints = ['cdn', 'img', 'image', 'images', 'media', 'static', 'akamaized', 'cloudfront', 'fastly'];
  if (cdnHints.some((hint) => imageHost.includes(hint))) return true;

  return false;
}

function isGoogleNewsUrl(url: string): boolean {
  return getHost(url).includes('news.google.com');
}

function extractGoogleNewsArticleId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match =
      parsed.pathname.match(/\/rss\/articles\/([^/?]+)/i) ||
      parsed.pathname.match(/\/articles\/([^/?]+)/i) ||
      parsed.pathname.match(/\/read\/([^/?]+)/i);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

async function decodeGoogleNewsUrlViaBatch(url: string): Promise<string | null> {
  const articleId = extractGoogleNewsArticleId(url);
  if (!articleId) return null;

  try {
    const bootstrapUrl = `https://news.google.com/rss/articles/${encodeURIComponent(
      articleId,
    )}?hl=en-US&gl=US&ceid=US:en&ucbcb=1`;

    const bootstrapResponse = await fetch(bootstrapUrl, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(9000),
    });
    if (!bootstrapResponse.ok) return null;

    const html = await bootstrapResponse.text();
    const signatureMatch = html.match(/data-n-a-sg="([^"]+)"/);
    const timestampMatch = html.match(/data-n-a-ts="([^"]+)"/);
    const signature = signatureMatch?.[1];
    const timestamp = timestampMatch?.[1];
    if (!signature || !timestamp) return null;

    const rpcPayload = `["garturlreq",[["en-US","US",["FINANCE_TOP_INDICES","WEB_TEST_1_0_0"],null,null,1,1,"US:en",null,180,null,null,null,null,null,0,null,null,[1608992183,723341000]],"en-US","US",1,[2,3,4,8],1,0,"655000234",0,0,null,0],"${articleId}",${timestamp},"${signature}"]`;
    const body = new URLSearchParams({
      'f.req': JSON.stringify([[['Fbv4je', rpcPayload, null, 'generic']]]),
    }).toString();

    const decodeResponse = await fetch(
      'https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je',
      {
        method: 'POST',
        headers: {
          ...FETCH_HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Referer: 'https://news.google.com/',
        },
        body,
        signal: AbortSignal.timeout(9000),
      },
    );
    if (!decodeResponse.ok) return null;

    const responseText = await decodeResponse.text();
    const jsonLine = responseText
      .split('\n')
      .find((line) => line.trim().startsWith('[['));
    if (!jsonLine) return null;

    const outer = JSON.parse(jsonLine) as unknown[];
    for (const row of outer) {
      if (!Array.isArray(row) || typeof row[2] !== 'string') continue;
      try {
        const parsed = JSON.parse(row[2]) as unknown;
        if (Array.isArray(parsed) && typeof parsed[1] === 'string') {
          const candidate = parsed[1];
          if (/^https?:\/\//i.test(candidate) && !candidate.includes('news.google.com')) {
            return candidate;
          }
        }
      } catch {
        // ignore malformed payload chunks
      }
    }
  } catch {
    // ignore
  }

  return null;
}

async function resolveGoogleNewsTargetUrl(url: string): Promise<string> {
  if (!isGoogleNewsUrl(url)) return url;
  const cached = GOOGLE_NEWS_CACHE.get(url);
  if (cached) return cached;

  const decoded = await decodeGoogleNewsUrlViaBatch(url);
  if (decoded) {
    GOOGLE_NEWS_CACHE.set(url, decoded);
    return decoded;
  }

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(9000),
    });
    const finalUrl = response.url || url;
    GOOGLE_NEWS_CACHE.set(url, finalUrl);
    return finalUrl;
  } catch {
    GOOGLE_NEWS_CACHE.set(url, url);
    return url;
  }
}

async function validateEditorialImageCandidate(
  imageUrl: string,
  sourceUrl: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (isFallbackImageUrl(imageUrl)) {
    return { ok: false, reason: 'fallback-like image URL' };
  }

  const validation = await validateImageEnhanced(imageUrl, {
    skipRegister: true,
    skipCache: true,
    skipDuplicateCheck: true,
    skipVisualSimilarity: true,
  });
  if (!validation.isValid) {
    return { ok: false, reason: validation.reason ?? 'failed validation' };
  }

  const imageHost = getHost(imageUrl);
  const sourceHost = getHost(sourceUrl);
  if (!isLikelyPublisherImageHost(imageHost, sourceHost)) {
    return { ok: false, reason: `image host not related to publisher (${imageHost})` };
  }

  return { ok: true };
}

async function resolveOriginalImageForSource(sourceUrl: string): Promise<ResolvedImage | null> {
  try {
    const fastUrl = await getBestArticleImage(sourceUrl, undefined, {
      skipRegister: true,
      skipCache: true,
      skipDuplicateCheck: true,
    });

    if (fastUrl) {
      const fastValidation = await validateEditorialImageCandidate(fastUrl, sourceUrl);
      if (fastValidation.ok) {
        return {
          imageUrl: fastUrl,
          sourceUrlUsed: sourceUrl,
          method: 'fast',
        };
      }
      console.log(`  [Restore] Fast candidate rejected: ${fastValidation.reason ?? 'unknown reason'}`);
    }
  } catch (error) {
    console.warn(`  [Restore] Fast extractor failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const advanced = await scrapeArticleImageAdvanced(sourceUrl);
    if (advanced?.url && advanced.confidence >= 0.35) {
      const advancedValidation = await validateEditorialImageCandidate(advanced.url, sourceUrl);
      if (advancedValidation.ok) {
        return {
          imageUrl: advanced.url,
          sourceUrlUsed: sourceUrl,
          method: `advanced:${advanced.method}`,
        };
      }
      console.log(`  [Restore] Advanced candidate rejected: ${advancedValidation.reason ?? 'unknown reason'}`);
    }
  } catch (error) {
    console.warn(`  [Restore] Advanced extractor failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return null;
}

async function resolveBestOriginalImage(row: NewsRow): Promise<ResolvedImage | null> {
  const targets = new Set<string>();
  if (isGoogleNewsUrl(row.source_url)) {
    const resolved = await resolveGoogleNewsTargetUrl(row.source_url);
    targets.add(resolved);
  }
  targets.add(row.source_url);

  for (const target of targets) {
    const candidate = await resolveOriginalImageForSource(target);
    if (candidate) return candidate;
  }

  return null;
}

async function fetchFallbackRows(limit: number): Promise<NewsRow[]> {
  const db = getSupabaseServerClient();
  const pageSize = 500;
  const matches: NewsRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await db
      .from('news_articles')
      .select('id,title_en,title_es,source_url,image_url,is_hidden,created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw error;
    }

    const rows = (data as NewsRow[] | null) ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      if (!INCLUDE_HIDDEN && row.is_hidden === true) continue;
      if (!isFallbackImageUrl(row.image_url)) continue;
      matches.push(row);
      if (!ALL && matches.length >= limit) {
        return matches;
      }
    }

    offset += rows.length;
    if (rows.length < pageSize) break;
  }

  return matches;
}

/**
 * Lightweight HEAD check to test whether an image URL is still alive.
 * Returns false for 4xx/5xx responses or network errors.
 */
async function isImageUrlAlive(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': FETCH_HEADERS['User-Agent'],
        Accept: 'image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetches articles that have non-fallback image URLs created within the
 * last STALE_DAYS days and HEAD-checks them for liveness.
 * Returns rows where the image URL is broken (4xx / network error).
 */
async function fetchStaleRows(limit: number): Promise<NewsRow[]> {
  const db = getSupabaseServerClient();
  const since = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const pageSize = 500;
  const candidates: NewsRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await db
      .from('news_articles')
      .select('id,title_en,title_es,source_url,image_url,is_hidden,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const rows = (data as NewsRow[] | null) ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      if (!INCLUDE_HIDDEN && row.is_hidden === true) continue;
      // Skip rows that would already be fixed by the fallback pass
      if (isFallbackImageUrl(row.image_url)) continue;
      candidates.push(row);
      if (!ALL && candidates.length >= limit * 10) break; // over-fetch for filtering
    }

    offset += rows.length;
    if (rows.length < pageSize) break;
  }

  console.log(`[Restore/stale] HEAD-checking ${candidates.length} non-fallback image URLs...`);

  // HEAD-check in parallel (limited concurrency to avoid hammering servers)
  const staleLimit = (await import('p-limit')).default(8);
  const staleRows: NewsRow[] = [];

  await Promise.all(
    candidates.map((row) =>
      staleLimit(async () => {
        if (!row.image_url) return;
        const alive = await isImageUrlAlive(row.image_url);
        if (!alive) {
          console.log(`  [stale] broken: ${row.image_url.slice(0, 100)}`);
          staleRows.push(row);
        }
      }),
    ),
  );

  return ALL ? staleRows : staleRows.slice(0, limit);
}

async function processRow(row: NewsRow): Promise<{ updated: boolean; reason?: string }> {
  const db = getSupabaseServerClient();
  const title = row.title_en || row.title_es || row.id;
  console.log(`\n[Restore] ${title.slice(0, 90)}...`);

  const resolved = await resolveBestOriginalImage(row);
  if (!resolved) {
    if (EXECUTE && HIDE_UNRESOLVED && row.is_hidden !== true) {
      const { error } = await db
        .from('news_articles')
        .update({
          is_hidden: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (!error) {
        console.log('  [Restore] No original image recovered -> hidden from feed');
        return { updated: true, reason: 'hidden_no_original_image' };
      }
      console.error(`  [Restore] Failed to hide unresolved article: ${error.message}`);
      return { updated: false, reason: `hide_failed:${error.message}` };
    }

    console.log('  [Restore] No original image recovered');
    return { updated: false, reason: 'no_image_found' };
  }

  if (row.image_url === resolved.imageUrl) {
    console.log('  [Restore] Existing image already optimal');
    return { updated: false, reason: 'already_optimal' };
  }

  console.log(`  [Restore] Selected (${resolved.method}): ${resolved.imageUrl.slice(0, 120)}...`);

  if (!EXECUTE) {
    return { updated: true };
  }

  const patch = {
    image_url: resolved.imageUrl,
    image_alt_text_en: row.title_en || row.title_es || 'AI news article image',
    image_alt_text_es: row.title_es || row.title_en || 'Imagen de noticia de inteligencia artificial',
    updated_at: new Date().toISOString(),
  };

  const { error } = await db
    .from('news_articles')
    .update(patch)
    .eq('id', row.id);

  if (error) {
    console.error(`  [Restore] Update failed: ${error.message}`);
    return { updated: false, reason: `db_error:${error.message}` };
  }

  return { updated: true };
}

async function computeCoverageStats(): Promise<{
  total: number;
  fallback: number;
  original: number;
  ratio: number;
}> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('news_articles')
    .select('image_url,is_hidden');

  if (error) {
    throw error;
  }

  const rows = (data ?? []).filter((row) => INCLUDE_HIDDEN || row.is_hidden !== true);
  const total = rows.length;
  const fallback = rows.filter((row) => isFallbackImageUrl(row.image_url)).length;
  const original = total - fallback;
  const ratio = total > 0 ? original / total : 0;

  return { total, fallback, original, ratio };
}

async function main(): Promise<void> {
  const requestedLimit = Number.isFinite(LIMIT) && LIMIT > 0 ? LIMIT : 250;
  const parallelism = Number.isFinite(PARALLEL) && PARALLEL > 0 ? PARALLEL : 3;
  const mode = EXECUTE ? 'execute' : 'preview';
  const targetRatio = Number.isFinite(TARGET_RATIO) ? Math.max(0, Math.min(1, TARGET_RATIO)) : 0.9;

  console.log(
    `[Restore] Starting original image restoration (${mode}, all=${ALL}, limit=${requestedLimit}, parallel=${parallelism}, include_hidden=${INCLUDE_HIDDEN}, hide_unresolved=${HIDE_UNRESOLVED})`,
  );

  const initialCoverage = await computeCoverageStats();
  console.log(
    `[Restore] Coverage before: ${(initialCoverage.ratio * 100).toFixed(2)}% originals (${initialCoverage.original}/${initialCoverage.total}, fallback=${initialCoverage.fallback})`,
  );
  console.log(`[Restore] Target coverage: ${(targetRatio * 100).toFixed(2)}%`);

  // Fetch rows to process: fallback-image articles + (optionally) stale-link articles
  const fallbackCandidates = await fetchFallbackRows(requestedLimit);
  let candidates = fallbackCandidates;

  if (STALE_CHECK) {
    console.log(`\n[Restore] Stale-link check: scanning articles from last ${STALE_DAYS} days...`);
    const staleCandidates = await fetchStaleRows(requestedLimit);
    console.log(`[Restore] Found ${staleCandidates.length} articles with broken image URLs`);
    // Merge, dedup by id
    const seen = new Set(fallbackCandidates.map((r) => r.id));
    for (const row of staleCandidates) {
      if (!seen.has(row.id)) {
        candidates.push(row);
        seen.add(row.id);
      }
    }
  }

  const rows = ALL ? candidates : candidates.slice(0, requestedLimit);
  console.log(`[Restore] Found ${fallbackCandidates.length} articles with fallback-like image URLs${STALE_CHECK ? ` + stale combined = ${candidates.length}` : ''}`);
  console.log(`[Restore] Processing ${rows.length} article(s)`);

  if (rows.length === 0) {
    console.log('[Restore] Nothing to do');
    return;
  }

  const limit = pLimit(parallelism);

  let updated = 0;
  let skipped = 0;
  const reasons = new Map<string, number>();

  await Promise.all(
    rows.map((row) =>
      limit(async () => {
        const result = await processRow(row);
        if (result.updated) {
          updated += 1;
        } else {
          skipped += 1;
          const reason = result.reason ?? 'unknown';
          reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 250));
      }),
    ),
  );

  console.log('\n[Restore] Completed');
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  if (reasons.size > 0) {
    console.log('  Skip reasons:');
    for (const [reason, count] of reasons.entries()) {
      console.log(`    - ${reason}: ${count}`);
    }
  }

  const finalCoverage = await computeCoverageStats();
  console.log(
    `[Restore] Coverage after: ${(finalCoverage.ratio * 100).toFixed(2)}% originals (${finalCoverage.original}/${finalCoverage.total}, fallback=${finalCoverage.fallback})`,
  );

  if (REQUIRE_TARGET && finalCoverage.ratio < targetRatio) {
    throw new Error(
      `original_image_coverage_below_target (${(finalCoverage.ratio * 100).toFixed(2)}% < ${(targetRatio * 100).toFixed(2)}%)`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[Restore] Fatal error:', error);
    process.exit(1);
  });
