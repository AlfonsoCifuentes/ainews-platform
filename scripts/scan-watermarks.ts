#!/usr/bin/env tsx
/**
 * 🛡️ Watermark sweep — OCR recent article images and remove any that carry
 * another outlet's brand/credit baked into the photo (legal safety).
 *
 * For each flagged image it first tries to re-resolve a CLEAN original via the
 * image pipeline (which now strips branding overlays). If that fails, it clears
 * image_url so the front-end shows the category fallback.
 *
 *   npm run ai:scan-watermarks                 # dry-run, last 2 days
 *   npm run ai:scan-watermarks -- --days 5
 *   npm run ai:scan-watermarks -- --execute    # write changes
 */
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) loadEnv({ path: envLocal }); else loadEnv();

import { getSupabaseServerClient } from '../lib/db/supabase';
import { scanImageForWatermark } from '../lib/services/watermark-guard';
import { resolveArticleImage } from '../lib/services/image-pipeline';

function arg(name: string, fallback?: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  return fallback;
}
const hasFlag = (n: string) => process.argv.includes(`--${n}`);

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase credentials');
  }
  const days = Number(arg('days', '2')) || 2;
  const execute = hasFlag('execute');
  const max = Number(arg('max', '60')) || 60;
  const cutoff = new Date(Date.now() - days * 864e5).toISOString();

  console.log(`[Watermark] window=${days}d execute=${execute} max=${max}`);
  const db = getSupabaseServerClient();

  const { data, error } = await db
    .from('news_articles')
    .select('id, source_url, image_url, is_hidden')
    .gte('published_at', cutoff)
    .not('image_url', 'is', null)
    .neq('image_url', '')
    .order('published_at', { ascending: false })
    .limit(max);
  if (error) throw new Error(`fetch failed: ${error.message}`);

  const rows = (data ?? []).filter((r) => r.is_hidden !== true);
  console.log(`[Watermark] scanning ${rows.length} images...`);

  let flagged = 0, repaired = 0, cleared = 0, ocrUnavailable = 0;

  for (const row of rows) {
    const scan = await scanImageForWatermark(row.image_url as string);
    if (!scan.ocrAvailable) { ocrUnavailable += 1; continue; }
    if (!scan.flagged) continue;

    flagged += 1;
    console.log(`[Watermark] ⚠️  ${row.id} flagged (${scan.reason}) — "${(scan.text || '').replace(/\s+/g, ' ').slice(0, 80)}"`);

    // Try to recover a clean original (pipeline strips overlays + rejects branded variants).
    let replacement: string | null = null;
    if (row.source_url) {
      try {
        const resolved = await resolveArticleImage(row.source_url as string);
        if (resolved?.url && resolved.url !== row.image_url) {
          const recheck = await scanImageForWatermark(resolved.url);
          if (!recheck.flagged) replacement = resolved.url;
        }
      } catch { /* ignore */ }
    }

    if (!execute) {
      console.log(`[Watermark]   would ${replacement ? `replace -> ${replacement.slice(0, 70)}` : 'clear (use fallback)'}`);
      continue;
    }

    const { error: upErr } = await db
      .from('news_articles')
      .update({ image_url: replacement ?? '', updated_at: new Date().toISOString() })
      .eq('id', row.id);
    if (upErr) { console.warn(`[Watermark]   update failed: ${upErr.message}`); continue; }
    if (replacement) repaired += 1; else cleared += 1;
  }

  console.log(
    `[Watermark] Done. flagged=${flagged} repaired=${repaired} cleared=${cleared} ` +
      `ocrUnavailable=${ocrUnavailable} (execute=${execute})`,
  );
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('[Watermark] Fatal:', e instanceof Error ? e.message : e);
  process.exit(1);
});
