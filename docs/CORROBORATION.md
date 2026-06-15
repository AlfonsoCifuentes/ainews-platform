# Multi-source corroboration engine

The editorial thesis of the site: **a story that many independent outlets report
is more important than one only a single source mentions.** This engine turns
that signal into a rankable score.

## How it works

1. **Ingestion** (`scripts/curate-news.ts`) already drops near-identical
   duplicates (cosine > ~0.93) and stores an embedding per article in
   `content_embeddings`.
2. **Clustering** (`scripts/cluster-news.ts`, `npm run ai:cluster`) loads recent
   articles + embeddings, groups the *same story across different outlets* with a
   looser cosine threshold (default **0.82**, title-overlap fallback when an
   embedding is missing), and counts **distinct registrable domains** per cluster.
3. **Importance** (`lib/ai/story-clustering.ts → computeImportance`) is dominated
   by corroboration, then modulated by source authority, quality and freshness:

   ```
   importance = log2(1 + distinctOutlets) * 10   // corroboration (dominant)
              + (bestTierWeight - 0.85) * 12      // source authority
              + avgQuality * 5                    // editorial quality
              + 6 * 0.5^(ageHours / 36)           // freshness (36h half-life)
   ```

4. **Storage** — written back to `news_articles`:
   `story_cluster_id`, `corroboration_count`, `importance_score`,
   `corroborating_sources` (JSON `[{domain,url,tier}]`), `is_cluster_primary`,
   `clustered_at`.
5. **Surfacing** — the homepage hero/featured use `fetchTopStories()`
   (importance-ranked, one article per cluster). Cards and the article page show
   a "Covered by N outlets" badge and list the corroborating sources.

Source tiers come from `lib/ai/news-sources.ts` (company/research > news >
aggregator/newsletter > podcast/tutorials/community).

## Operating it

```bash
# 1) One-time: apply the schema (adds the corroboration columns)
npm run db:migrate            # or apply supabase/migrations/20260615000000_news_corroboration.sql

# 2) Cluster recent stories (runs automatically in the AI Curation workflow)
npm run ai:cluster                 # last 5 days
npm run ai:cluster -- --days 7     # custom window
npm run ai:cluster -- --dry-run    # preview clusters, no writes
npm run ai:cluster -- --threshold 0.80
```

The read layer degrades gracefully: before the migration runs, queries fall back
to chronological order and the badges simply don't render (every article looks
like a singleton).

## Tuning

- **More aggressive grouping** → lower `--threshold` (e.g. 0.78). Risk: merging
  distinct stories.
- **Stricter grouping** → raise toward 0.88.
- Importance weights live in `computeImportance` and are covered by
  `tests/unit/story-clustering.test.ts`.
