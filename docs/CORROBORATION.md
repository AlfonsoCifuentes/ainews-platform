# Multi-source corroboration engine

The editorial thesis of the site: **a story that many independent outlets report
is more important than one only a single source mentions.** This engine turns
that signal into a rankable score.

## How it works

1. **Ingestion** (`scripts/curate-news.ts`) already drops near-identical
   duplicates (cosine > ~0.93) and stores an embedding per article in
   `content_embeddings`.
2. **Clustering** (`scripts/cluster-news.ts`, `npm run ai:cluster`) loads recent
   articles + embeddings and groups the *same story across different outlets*.
   Two articles cluster only when **all** of:
   - cosine ≥ **0.91** (default; AI-news embeddings encode strong *topic*
     similarity, so distinct stories routinely reach 0.85–0.90 — the bar sits
     just under the dedup threshold of ~0.93),
   - a light **headline-overlap guard** (Jaccard ≥ 0.3) — blocks distinct
     stories that merely embed alike while still allowing paraphrased coverage,
   - **published within 72h** of each other (same story clusters in time).

   Articles without a usable embedding fall back to a strict headline match
   (Jaccard ≥ 0.65). Corroboration counts **distinct registrable domains** per
   cluster. (Single-linkage over raw cosine over-merges; these guards keep it
   precise — on a set of distinct stories it correctly yields all singletons.)
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

- **More aggressive grouping** → lower `--threshold` (e.g. 0.88). Risk: merging
  distinct stories that share AI vocabulary.
- **Stricter grouping** → raise toward 0.95.
- The headline guard (`COMBINED_TITLE_GUARD`), embedding-less fallback
  (`TITLE_FALLBACK_THRESHOLD`) and time window (`DEFAULT_MAX_HOURS_APART`) live
  in `lib/ai/story-clustering.ts`.
- Importance weights live in `computeImportance` and are covered by
  `tests/unit/story-clustering.test.ts`.
