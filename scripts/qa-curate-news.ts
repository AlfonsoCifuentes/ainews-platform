#!/usr/bin/env tsx

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
  loadEnv({ path: envLocal });
} else {
  loadEnv();
}

import { getSupabaseServerClient } from '../lib/db/supabase';

type CandidateRow = {
  id: string;
  title_en: string | null;
  title_es: string | null;
  summary_en: string | null;
  summary_es: string | null;
  content_en: string | null;
  content_es: string | null;
  source_url: string | null;
  published_at: string;
  is_hidden?: boolean | null;
};

type HideDecision = {
  id: string;
  reason: string;
  title: string;
  sourceUrl: string;
  publishedAt: string;
};

function parseArgs(argv: string[]) {
  const args = new Map<string, string | boolean>();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const [key, inlineValue] = token.split('=', 2);
    if (inlineValue !== undefined) {
      args.set(key, inlineValue);
      continue;
    }

    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args.set(key, next);
      i += 1;
      continue;
    }

    args.set(key, true);
  }

  const execute = Boolean(args.get('--execute'));
  const dryRun = Boolean(args.get('--dry-run')) || !execute;

  const daysRaw = args.get('--days');
  const limitRaw = args.get('--limit');

  const days = typeof daysRaw === 'string' ? Number(daysRaw) : 7;
  const limit = typeof limitRaw === 'string' ? Number(limitRaw) : 250;

  return {
    execute,
    dryRun,
    days: Number.isFinite(days) && days > 0 ? days : 7,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 250,
  };
}

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(input: string): Set<string> {
  const tokens = normalizeText(input).split(' ').filter(Boolean);
  return new Set(tokens);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) {
    if (b.has(t)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function isDegenerateText(title: string, summary: string, content: string): boolean {
  const t = normalizeText(title);
  const s = normalizeText(summary);
  const c = normalizeText(content);

  if (!t || !s || !c) return false;

  if (s === t) return true;
  if (s.startsWith(t) && t.length >= 20) return true;
  if (t.startsWith(s) && s.length >= 20) return true;

  if (c.startsWith(t) && t.length >= 25) return true;
  if (c.startsWith(s) && s.length >= 25) return true;

  const sim = jaccard(tokenSet(title), tokenSet(summary));
  if (sim >= 0.92) return true;

  return false;
}

function isRedditNonNewsByUrlAndTitle(sourceUrl: string, title: string): { reject: boolean; reason?: string } {
  let hostname = '';
  try {
    hostname = new URL(sourceUrl).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return { reject: false };
  }

  if (hostname !== 'reddit.com' && hostname !== 'old.reddit.com' && hostname !== 'new.reddit.com') {
    return { reject: false };
  }

  const titleLower = title.toLowerCase();
  const urlLower = sourceUrl.toLowerCase();

  if (urlLower.includes('/poll/')) return { reject: true, reason: 'non_news_reddit_poll_url' };
  if (/\bama\b/i.test(title) || titleLower.includes('ask me anything')) return { reject: true, reason: 'non_news_reddit_ama' };
  if (/(^|\[)poll(\]|:|\b)/i.test(title)) return { reject: true, reason: 'non_news_reddit_poll_title' };

  if (
    title.trim().endsWith('?') &&
    (
      titleLower.startsWith('question') ||
      titleLower.startsWith('ask ') ||
      titleLower.includes('what do you think') ||
      titleLower.includes('anyone else')
    )
  ) {
    return { reject: true, reason: 'non_news_reddit_discussion_question' };
  }

  return { reject: false };
}

async function main() {
  const { execute, dryRun, days, limit } = parseArgs(process.argv.slice(2));

  console.log('[QA Curator] Starting');
  console.log(`- Mode: ${dryRun ? 'dry-run' : 'execute'}`);
  console.log(`- Window: last ${days} day(s)`);
  console.log(`- Limit: ${limit}`);

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[QA Curator] Missing SUPABASE_SERVICE_ROLE_KEY (required to hide rows safely).');
    process.exit(1);
  }

  const db = getSupabaseServerClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const selectWithHidden =
    'id,title_en,title_es,summary_en,summary_es,content_en,content_es,source_url,published_at,is_hidden';
  const selectWithoutHidden =
    'id,title_en,title_es,summary_en,summary_es,content_en,content_es,source_url,published_at';

  let migrationMissing = false;
  let { data, error } = await db
    .from('news_articles')
    .select(selectWithHidden)
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error && (error as { code?: string }).code === '42703') {
    migrationMissing = true;
    ({ data, error } = await db
      .from('news_articles')
      .select(selectWithoutHidden)
      .gte('published_at', since)
      .order('published_at', { ascending: false })
      .limit(limit));
  }

  if (error) {
    console.error('[QA Curator] Supabase fetch error:', error);
    process.exit(1);
  }

  if (execute && migrationMissing) {
    console.error(
      '[QA Curator] Cannot execute hides because `is_hidden` is missing. Apply the Supabase migration first.'
    );
    process.exit(1);
  }

  const rows = (data ?? []) as CandidateRow[];
  console.log(`[QA Curator] Loaded ${rows.length} article(s)`);

  const decisions: HideDecision[] = [];

  for (const row of rows) {
    if (row.is_hidden) continue;

    const title = (row.title_es || row.title_en || '').trim();
    const sourceUrl = (row.source_url || '').trim();

    if (!title || !sourceUrl) continue;

    const nonNews = isRedditNonNewsByUrlAndTitle(sourceUrl, title);
    if (nonNews.reject) {
      decisions.push({
        id: row.id,
        reason: nonNews.reason ?? 'non_news',
        title,
        sourceUrl,
        publishedAt: row.published_at,
      });
      continue;
    }

    const enDegenerate =
      row.title_en && row.summary_en && row.content_en
        ? isDegenerateText(row.title_en, row.summary_en, row.content_en)
        : false;
    const esDegenerate =
      row.title_es && row.summary_es && row.content_es
        ? isDegenerateText(row.title_es, row.summary_es, row.content_es)
        : false;

    if (enDegenerate || esDegenerate) {
      decisions.push({
        id: row.id,
        reason: 'degenerate_rewrite',
        title,
        sourceUrl,
        publishedAt: row.published_at,
      });
    }
  }

  console.log(`[QA Curator] Flagged ${decisions.length} article(s) to hide`);

  const preview = decisions.slice(0, 25);
  for (const d of preview) {
    console.log(`- ${d.reason} | ${d.publishedAt} | ${d.title.slice(0, 90)}`);
  }

  if (dryRun) {
    console.log('[QA Curator] Dry-run complete (no changes applied).');
    return;
  }

  if (decisions.length === 0) {
    console.log('[QA Curator] Nothing to hide.');
    return;
  }

  console.log('[QA Curator] Applying hides...');

  const nowIso = new Date().toISOString();

  const byReason = new Map<string, string[]>();
  for (const d of decisions) {
    const list = byReason.get(d.reason) ?? [];
    list.push(d.id);
    byReason.set(d.reason, list);
  }

  const batchSize = 25;
  let processed = 0;
  for (const [reason, idsForReason] of byReason.entries()) {
    for (let i = 0; i < idsForReason.length; i += batchSize) {
      const ids = idsForReason.slice(i, i + batchSize);
      const { error: updateError } = await db
        .from('news_articles')
        .update({
          is_hidden: true,
          hidden_reason: reason,
          hidden_at: nowIso,
        })
        .in('id', ids);

      if (updateError) {
        console.error('[QA Curator] Update error:', updateError);
        process.exit(1);
      }

      processed += ids.length;
      console.log(`[QA Curator] Hidden ${processed}/${decisions.length} (reason: ${reason})`);
    }
  }

  console.log('[QA Curator] Done.');
}

main().catch((err) => {
  console.error('[QA Curator] Fatal error:', err);
  process.exit(1);
});
