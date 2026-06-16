#!/usr/bin/env tsx
/**
 * 🖼️ Deterministic image-quality fix (no OCR, zero API cost).
 *
 * For every article it:
 *   - strips publisher branding overlays from the image URL,
 *   - clears source LOGOS / brand assets (e.g. the arXiv logo) and
 *     watermarked/branded share-card variants,
 *   - clears images shared by many articles (a logo/placeholder leaking),
 *   - tries to recover a clean original via the image pipeline before clearing.
 *
 * Cleared images fall back to a per-article spaced fallback in the UI, so the
 * same picture never repeats across consecutive stories.
 *
 *   npm run ai:fix-images-quality                 # dry-run, all visible articles
 *   npm run ai:fix-images-quality -- --execute    # write changes
 *   npm run ai:fix-images-quality -- --days 7     # limit window
 */
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) loadEnv({ path: envLocal }); else loadEnv();

import { getSupabaseServerClient } from '../lib/db/supabase';
import {
  stripImageOverlays,
  looksLikeBrandedImageUrl,
  looksLikeLogoOrBrandAsset,
} from '../lib/services/watermark-guard';
import { resolveArticleImage } from '../lib/services/image-pipeline';

function arg(name: string, fb?: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  return fb;
}
const hasFlag = (n: string) => process.argv.includes(`--${n}`);

const OVERSHARED_THRESHOLD = 3;

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase credentials');
  }
  const execute = hasFlag('execute');
  const days = arg('days') ? Number(arg('days')) : 0;

  const db = getSupabaseServerClient();
  let query = db
    .from('news_articles')
    .select('id, source_url, image_url, is_hidden, published_at')
    .order('published_at', { ascending: false })
    .limit(1000);
  if (days > 0) query = query.gte('published_at', new Date(Date.now() - days * 864e5).toISOString());

  const { data, error } = await query;
  if (error) throw new Error(`fetch failed: ${error.message}`);
  const rows = (data ?? []).filter((r) => r.is_hidden !== true && r.image_url && String(r.image_url).trim() !== '');

  // Frequency of each image URL to detect leaked shared logos/placeholders.
  const freq = new Map<string, number>();
  for (const r of rows) freq.set(r.image_url as string, (freq.get(r.image_url as string) ?? 0) + 1);

  console.log(`[FixImages] ${rows.length} images, execute=${execute}`);

  let stripped = 0, recovered = 0, cleared = 0, untouched = 0;

  for (const row of rows) {
    const url = row.image_url as string;
    const cleaned = stripImageOverlays(url);
    const isLogo = looksLikeLogoOrBrandAsset(cleaned);
    const isBranded = looksLikeBrandedImageUrl(cleaned);
    const isOverShared = (freq.get(url) ?? 0) >= OVERSHARED_THRESHOLD;

    if (isLogo || isBranded || isOverShared) {
      // Try to recover a clean original (skip for logos — they never recover).
      let replacement = '';
      if (row.source_url && !isLogo) {
        try {
          const resolved = await resolveArticleImage(row.source_url as string);
          if (
            resolved?.url &&
            !looksLikeLogoOrBrandAsset(resolved.url) &&
            !looksLikeBrandedImageUrl(resolved.url)
          ) {
            replacement = stripImageOverlays(resolved.url);
          }
        } catch { /* ignore */ }
      }
      const reason = isLogo ? 'logo' : isBranded ? 'branded' : 'overshared';
      console.log(`[FixImages] ${row.id} ${reason} -> ${replacement ? 'recovered' : 'cleared(fallback)'}`);
      if (execute) {
        await db.from('news_articles').update({ image_url: replacement, updated_at: new Date().toISOString() }).eq('id', row.id);
      }
      if (replacement) recovered += 1; else cleared += 1;
      continue;
    }

    if (cleaned !== url) {
      if (execute) {
        await db.from('news_articles').update({ image_url: cleaned, updated_at: new Date().toISOString() }).eq('id', row.id);
      }
      stripped += 1;
      continue;
    }
    untouched += 1;
  }

  console.log(
    `[FixImages] Done. stripped=${stripped} recovered=${recovered} cleared=${cleared} untouched=${untouched} (execute=${execute})`,
  );
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('[FixImages] Fatal:', e instanceof Error ? e.message : e);
  process.exit(1);
});
