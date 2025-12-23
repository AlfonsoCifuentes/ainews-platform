-- =====================================================
-- Weekly AI News Podcast Episodes
-- Date: 2025-12-23
-- =====================================================

CREATE TABLE IF NOT EXISTS news_podcast_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  title_en TEXT NOT NULL,
  title_es TEXT NOT NULL,
  summary_en TEXT NOT NULL,
  summary_es TEXT NOT NULL,
  script_en TEXT NOT NULL,
  script_es TEXT NOT NULL,
  highlights_en TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  highlights_es TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  audio_url_en TEXT,
  audio_url_es TEXT,
  audio_duration_en INTEGER,
  audio_duration_es INTEGER,
  sources JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (period_start, period_end)
);

CREATE INDEX idx_news_podcast_episodes_period ON news_podcast_episodes(period_end DESC);

ALTER TABLE news_podcast_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY news_podcast_episodes_select_all ON news_podcast_episodes
  FOR SELECT USING (true);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================