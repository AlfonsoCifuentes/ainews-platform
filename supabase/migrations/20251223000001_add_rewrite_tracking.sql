-- ============================================
-- ADD REWRITE TRACKING FOR NEWS ARTICLES
-- Track which AI model was used for rewriting
-- and quality metrics for AdSense optimization
-- ============================================

-- Add columns for tracking AI rewrite status
ALTER TABLE news_articles 
ADD COLUMN IF NOT EXISTS rewrite_model TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rewrite_version INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rewrite_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS value_score NUMERIC(3,2) DEFAULT NULL CHECK (value_score >= 0 AND value_score <= 1);

-- Create index for finding articles that need rewriting
CREATE INDEX IF NOT EXISTS idx_news_rewrite_model ON news_articles(rewrite_model);
CREATE INDEX IF NOT EXISTS idx_news_rewrite_version ON news_articles(rewrite_version);

-- Comment on columns
COMMENT ON COLUMN news_articles.rewrite_model IS 'AI model used for rewriting (e.g., gpt-4o-mini, gpt-4o)';
COMMENT ON COLUMN news_articles.rewrite_version IS 'Version of the rewrite prompt/logic used';
COMMENT ON COLUMN news_articles.rewrite_at IS 'Timestamp when the article was last rewritten by AI';
COMMENT ON COLUMN news_articles.value_score IS 'Quality/value score for AdSense optimization (0-1)';
