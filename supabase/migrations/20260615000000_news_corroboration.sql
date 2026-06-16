-- ============================================================================
-- Multi-source corroboration & importance scoring for news_articles
--
-- Adds the columns the clustering job (scripts/cluster-news.ts) writes:
--   story_cluster_id      stable id grouping the same story across outlets
--   corroboration_count   number of DISTINCT independent outlets covering it
--   importance_score      ranking signal (dominated by corroboration)
--   corroborating_sources JSON list of {domain, url, tier}
--   is_cluster_primary    the representative article shown for the cluster
--   clustered_at          last time the row was (re)clustered
--
-- Safe to run repeatedly (IF NOT EXISTS). Existing rows keep sensible defaults
-- (treated as singleton clusters) until the clustering job runs.
-- ============================================================================

ALTER TABLE news_articles
  ADD COLUMN IF NOT EXISTS story_cluster_id      UUID,
  ADD COLUMN IF NOT EXISTS corroboration_count   INTEGER       NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS importance_score      NUMERIC(8,3)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS corroborating_sources JSONB         NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_cluster_primary    BOOLEAN       NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS clustered_at          TIMESTAMPTZ;

-- Feed ordering by importance, and fast cluster lookups.
CREATE INDEX IF NOT EXISTS idx_news_importance ON news_articles(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_news_cluster    ON news_articles(story_cluster_id);
CREATE INDEX IF NOT EXISTS idx_news_primary    ON news_articles(is_cluster_primary) WHERE is_cluster_primary = true;
