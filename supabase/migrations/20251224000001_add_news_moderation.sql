-- ============================================
-- ADD BASIC MODERATION FIELDS FOR NEWS ARTICLES
-- Allows hiding non-news / low-quality items from feeds
-- ============================================

ALTER TABLE news_articles
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hidden_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ DEFAULT NULL;

-- Fast path for feeds (only show visible items)
CREATE INDEX IF NOT EXISTS idx_news_articles_visible_published_at
  ON news_articles (published_at DESC)
  WHERE is_hidden = FALSE;

CREATE INDEX IF NOT EXISTS idx_news_articles_is_hidden
  ON news_articles (is_hidden);

COMMENT ON COLUMN news_articles.is_hidden IS 'If true, the article is hidden from public feeds/search.';
COMMENT ON COLUMN news_articles.hidden_reason IS 'Machine-readable reason for hiding (e.g., non_news, degenerate_rewrite).';
COMMENT ON COLUMN news_articles.hidden_at IS 'Timestamp when the article was hidden.';
