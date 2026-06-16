#!/usr/bin/env tsx
/**
 * Multi-source corroboration clustering.
 *
 * Groups recent articles that report the SAME story across DIFFERENT outlets,
 * counts the distinct independent sources, and writes an importance score the
 * feed sorts by. Run after curation (npm run ai:curate).
 *
 * Usage:
 *   npm run ai:cluster                       # cluster last 5 days
 *   npm run ai:cluster -- --days 7           # custom window
 *   npm run ai:cluster -- --dry-run          # compute, do not write
 *   npm run ai:cluster -- --threshold 0.80   # custom cosine threshold
 */

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) loadEnv({ path: envLocal });
else loadEnv();

import { getSupabaseServerClient } from '../lib/db/supabase';
import {
  clusterArticles,
  DEFAULT_CLUSTER_THRESHOLD,
  type ClusterableArticle,
} from '../lib/ai/story-clustering';

function argValue(name: string, fallback?: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  return fallback;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseEmbedding(raw: unknown): number[] | null {
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as number[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

async function main(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  }

  const days = Number(argValue('days', '5')) || 5;
  const threshold = Number(argValue('threshold', String(DEFAULT_CLUSTER_THRESHOLD))) || DEFAULT_CLUSTER_THRESHOLD;
  const dryRun = hasFlag('dry-run');
  const cutoffIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  console.log(`[ClusterNews] window=${days}d threshold=${threshold} dryRun=${dryRun}`);

  const db = getSupabaseServerClient();

  // 1. Recent, visible articles.
  const { data: rows, error } = await db
    .from('news_articles')
    .select('id, title_en, source_url, published_at, quality_score, story_cluster_id, is_hidden')
    .gte('published_at', cutoffIso)
    .order('published_at', { ascending: false })
    .limit(800);

  if (error) throw new Error(`[ClusterNews] fetch articles failed: ${error.message}`);

  const articles = (rows ?? []).filter((r) => r.is_hidden !== true) as Array<{
    id: string;
    title_en: string;
    source_url: string | null;
    published_at: string;
    quality_score: number | null;
    story_cluster_id: string | null;
  }>;

  if (articles.length === 0) {
    console.log('[ClusterNews] No recent articles. Nothing to do.');
    return;
  }
  console.log(`[ClusterNews] Loaded ${articles.length} recent articles`);

  // 2. Their embeddings (batched IN queries).
  const embeddingById = new Map<string, number[]>();
  const ids = articles.map((a) => a.id);
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    const { data: embRows, error: embErr } = await db
      .from('content_embeddings')
      .select('content_id, embedding')
      .eq('content_type', 'article')
      .in('content_id', batch);
    if (embErr) {
      console.warn(`[ClusterNews] embedding batch failed: ${embErr.message}`);
      continue;
    }
    for (const row of embRows ?? []) {
      const emb = parseEmbedding((row as { embedding: unknown }).embedding);
      if (emb) embeddingById.set((row as { content_id: string }).content_id, emb);
    }
  }
  console.log(`[ClusterNews] Embeddings available for ${embeddingById.size}/${articles.length} articles`);

  // 3. Cluster.
  const clusterable: ClusterableArticle[] = articles.map((a) => ({
    id: a.id,
    title: a.title_en,
    sourceUrl: a.source_url ?? '',
    publishedAt: a.published_at,
    qualityScore: a.quality_score ?? 0.8,
    embedding: embeddingById.get(a.id) ?? null,
  }));

  const clusters = clusterArticles(clusterable, { clusterThreshold: threshold });
  const existingClusterId = new Map(articles.map((a) => [a.id, a.story_cluster_id] as const));

  const multi = clusters.filter((c) => c.corroborationCount > 1);
  console.log(
    `[ClusterNews] ${clusters.length} clusters (${multi.length} corroborated by >1 outlet). ` +
      `Top corroboration: ${clusters[0]?.corroborationCount ?? 0} outlets, importance ${clusters[0]?.importance ?? 0}`,
  );

  if (dryRun) {
    multi.slice(0, 10).forEach((c, i) => {
      console.log(
        `  #${i + 1} [${c.corroborationCount} outlets · imp ${c.importance}] ${c.distinctDomains.join(', ')}`,
      );
    });
    console.log('[ClusterNews] DRY-RUN: no writes.');
    return;
  }

  // 4. Persist. Reuse an existing cluster id among members for stability.
  let updated = 0;
  for (const cluster of clusters) {
    const reused = cluster.articleIds
      .map((id) => existingClusterId.get(id))
      .find((cid): cid is string => Boolean(cid));
    const clusterId = reused ?? randomUUID();

    for (const articleId of cluster.articleIds) {
      const isPrimary = articleId === cluster.primaryId;
      const { error: upErr } = await db
        .from('news_articles')
        .update({
          story_cluster_id: clusterId,
          corroboration_count: cluster.corroborationCount,
          importance_score: cluster.importance,
          corroborating_sources: cluster.sources,
          is_cluster_primary: isPrimary,
          clustered_at: new Date().toISOString(),
        })
        .eq('id', articleId);
      if (upErr) {
        console.warn(`[ClusterNews] update ${articleId} failed: ${upErr.message}`);
        continue;
      }
      updated += 1;
    }
  }

  console.log(`[ClusterNews] Done. Updated ${updated} articles across ${clusters.length} clusters.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[ClusterNews] Fatal:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
