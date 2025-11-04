-- Phase 5.1 - Category E: LLM/Agents
-- Cross-Lingual Embeddings & Fact-Checking Tables

-- ============================================================================
-- 1. Add normalized_embedding column to news_articles
-- ============================================================================

ALTER TABLE news_articles
ADD COLUMN IF NOT EXISTS normalized_embedding vector(1536);

COMMENT ON COLUMN news_articles.normalized_embedding IS 
'Cross-lingual normalized embedding (average of EN + ES embeddings)';

-- ============================================================================
-- 2. Create fact_checks table
-- ============================================================================

CREATE TABLE IF NOT EXISTS fact_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  claims jsonb NOT NULL DEFAULT '[]',
  results jsonb NOT NULL DEFAULT '[]',
  overall_score int NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fact_checks
CREATE INDEX IF NOT EXISTS idx_fact_checks_article_id 
ON fact_checks(article_id);

CREATE INDEX IF NOT EXISTS idx_fact_checks_score_desc 
ON fact_checks(overall_score DESC);

CREATE INDEX IF NOT EXISTS idx_fact_checks_checked_at_desc 
ON fact_checks(checked_at DESC);

-- Partial index for high-quality articles
CREATE INDEX IF NOT EXISTS idx_fact_checks_verified_only 
ON fact_checks(article_id, overall_score)
WHERE overall_score >= 70;

COMMENT ON TABLE fact_checks IS 
'Stores fact-checking results for news articles';

-- ============================================================================
-- 3. Function: match_bilingual_content
-- ============================================================================

CREATE OR REPLACE FUNCTION match_bilingual_content(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title_en text,
  title_es text,
  content_en text,
  content_es text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    title_en,
    title_es,
    content_en,
    content_es,
    1 - (normalized_embedding <=> query_embedding) as similarity
  FROM news_articles
  WHERE 
    normalized_embedding IS NOT NULL
    AND 1 - (normalized_embedding <=> query_embedding) > match_threshold
  ORDER BY normalized_embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION match_bilingual_content IS 
'Find similar content using cross-lingual normalized embeddings';

-- ============================================================================
-- 4. Function: get_articles_needing_normalization
-- ============================================================================

CREATE OR REPLACE FUNCTION get_articles_needing_normalization(
  batch_size int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  embedding_en vector(1536),
  embedding_es vector(1536)
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    embedding_en,
    embedding_es
  FROM news_articles
  WHERE 
    embedding_en IS NOT NULL
    AND embedding_es IS NOT NULL
    AND normalized_embedding IS NULL
  LIMIT batch_size;
$$;

COMMENT ON FUNCTION get_articles_needing_normalization IS 
'Get articles that need cross-lingual embedding normalization';

-- ============================================================================
-- 5. Function: get_fact_check_summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_fact_check_summary(
  days int DEFAULT 30
)
RETURNS TABLE (
  total_checked bigint,
  avg_score numeric,
  verified_count bigint,
  unverified_count bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(*) as total_checked,
    ROUND(AVG(overall_score), 2) as avg_score,
    COUNT(*) FILTER (WHERE overall_score >= 70) as verified_count,
    COUNT(*) FILTER (WHERE overall_score < 40) as unverified_count
  FROM fact_checks
  WHERE checked_at > now() - interval '1 day' * days;
$$;

COMMENT ON FUNCTION get_fact_check_summary IS 
'Get fact-checking statistics for the last N days';

-- ============================================================================
-- 6. Index for normalized_embedding vector similarity
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_news_articles_normalized_embedding 
ON news_articles 
USING ivfflat (normalized_embedding vector_cosine_ops)
WITH (lists = 100);

COMMENT ON INDEX idx_news_articles_normalized_embedding IS 
'IVFFlat index for fast similarity search on normalized embeddings';

-- ============================================================================
-- 7. Monitoring view: Cross-lingual embedding coverage
-- ============================================================================

CREATE OR REPLACE VIEW v_embedding_coverage AS
SELECT
  COUNT(*) as total_articles,
  COUNT(embedding_en) as has_en_embedding,
  COUNT(embedding_es) as has_es_embedding,
  COUNT(normalized_embedding) as has_normalized,
  ROUND(100.0 * COUNT(embedding_en) / NULLIF(COUNT(*), 0), 2) as pct_en,
  ROUND(100.0 * COUNT(embedding_es) / NULLIF(COUNT(*), 0), 2) as pct_es,
  ROUND(100.0 * COUNT(normalized_embedding) / NULLIF(COUNT(*), 0), 2) as pct_normalized
FROM news_articles;

COMMENT ON VIEW v_embedding_coverage IS 
'Monitor embedding coverage across languages';

-- ============================================================================
-- 8. Monitoring view: Fact-checking metrics
-- ============================================================================

CREATE OR REPLACE VIEW v_fact_check_metrics AS
SELECT
  DATE(checked_at) as check_date,
  COUNT(*) as articles_checked,
  ROUND(AVG(overall_score), 2) as avg_score,
  COUNT(*) FILTER (WHERE overall_score >= 80) as high_quality,
  COUNT(*) FILTER (WHERE overall_score >= 60 AND overall_score < 80) as verified,
  COUNT(*) FILTER (WHERE overall_score >= 40 AND overall_score < 60) as partial,
  COUNT(*) FILTER (WHERE overall_score < 40) as unverified
FROM fact_checks
WHERE checked_at > now() - interval '30 days'
GROUP BY DATE(checked_at)
ORDER BY check_date DESC;

COMMENT ON VIEW v_fact_check_metrics IS 
'Daily fact-checking metrics for the last 30 days';

-- ============================================================================
-- 9. Permissions
-- ============================================================================

GRANT SELECT ON fact_checks TO authenticated;
GRANT SELECT ON fact_checks TO anon;
GRANT SELECT ON v_embedding_coverage TO authenticated;
GRANT SELECT ON v_fact_check_metrics TO authenticated;

-- ============================================================================
-- 10. Sample queries for testing
-- ============================================================================

-- Test cross-lingual search
-- SELECT * FROM match_bilingual_content(
--   (SELECT normalized_embedding FROM news_articles WHERE id = 'some-uuid'),
--   0.75,
--   5
-- );

-- Check normalization progress
-- SELECT * FROM v_embedding_coverage;

-- Get fact-check stats
-- SELECT * FROM get_fact_check_summary(7); -- Last 7 days

-- View recent fact-check metrics
-- SELECT * FROM v_fact_check_metrics;
