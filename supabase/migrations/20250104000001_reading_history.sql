-- Migration: Add reading history and recommendations tables
-- Date: 2025-01-04

-- user_reading_history: Track what users read
CREATE TABLE IF NOT EXISTS user_reading_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  read_count INTEGER DEFAULT 1,
  total_time_spent INTEGER DEFAULT 0, -- in seconds
  scroll_depth INTEGER DEFAULT 0, -- percentage 0-100
  first_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, article_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reading_history_user ON user_reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_article ON user_reading_history(article_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_last_read ON user_reading_history(last_read_at DESC);

-- RLS Policies
ALTER TABLE user_reading_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own reading history
CREATE POLICY "Users can view own reading history"
  ON user_reading_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own reading history
CREATE POLICY "Users can insert own reading history"
  ON user_reading_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reading history
CREATE POLICY "Users can update own reading history"
  ON user_reading_history
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE user_reading_history IS 'Tracks user article reading behavior for recommendations';
COMMENT ON COLUMN user_reading_history.read_count IS 'Number of times article was read';
COMMENT ON COLUMN user_reading_history.total_time_spent IS 'Total time spent reading in seconds';
COMMENT ON COLUMN user_reading_history.scroll_depth IS 'Maximum scroll depth reached (0-100%)';
