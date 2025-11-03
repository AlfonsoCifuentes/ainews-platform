-- =====================================================
-- Phase 5+ Complete Migration
-- Date: 2024-11-03
-- Features: Flashcards, Highlights, Comments, Agents
-- =====================================================

-- 1. FLASHCARDS TABLE (Spaced Repetition System)
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'course')),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  category TEXT,
  interval INTEGER DEFAULT 0,
  repetitions INTEGER DEFAULT 0,
  ease_factor DECIMAL(3,2) DEFAULT 2.5 CHECK (ease_factor >= 1.3 AND ease_factor <= 2.5),
  due_at TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flashcards_user_due ON flashcards(user_id, due_at);
CREATE INDEX idx_flashcards_content ON flashcards(content_id, content_type);

-- 2. USER HIGHLIGHTS TABLE
CREATE TABLE IF NOT EXISTS user_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  selection TEXT NOT NULL,
  note TEXT,
  color TEXT DEFAULT 'yellow' CHECK (color IN ('yellow', 'blue', 'green', 'pink', 'purple')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_highlights_user_content ON user_highlights(user_id, content_id);

-- 3. COMMENTS TABLE (Discussion Threads)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'course')),
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_content ON comments(content_id, content_type);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_user ON comments(user_id);

-- 4. COMMENT LIKES TABLE
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_comment_likes_user ON comment_likes(user_id);

-- 5. FACT CHECKS TABLE (Multi-Source Verification)
CREATE TABLE IF NOT EXISTS fact_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  claim TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('verified', 'disputed', 'unverified', 'false')),
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  explanation TEXT,
  sources JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fact_checks_article ON fact_checks(article_id);
CREATE INDEX idx_fact_checks_verdict ON fact_checks(verdict);

-- 6. BIAS ANALYSES TABLE
CREATE TABLE IF NOT EXISTS bias_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  bias_type TEXT CHECK (bias_type IN ('political', 'commercial', 'sensational', 'none')),
  bias_level TEXT CHECK (bias_level IN ('none', 'low', 'moderate', 'high')),
  indicators JSONB,
  recommendations JSONB,
  tonality JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bias_analyses_article ON bias_analyses(article_id);
CREATE INDEX idx_bias_analyses_bias_level ON bias_analyses(bias_level);

-- 7. PERSPECTIVE SUMMARIES TABLE
CREATE TABLE IF NOT EXISTS perspective_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  perspectives JSONB,
  consensus JSONB,
  disagreements JSONB,
  synthesized_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_perspective_summaries_topic ON perspective_summaries(topic);
CREATE INDEX idx_perspective_summaries_created ON perspective_summaries(created_at DESC);

-- 8. AUDIO FILES TABLE (TTS Cache)
CREATE TABLE IF NOT EXISTS audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'course')),
  locale TEXT NOT NULL CHECK (locale IN ('en', 'es')),
  voice TEXT DEFAULT 'default' CHECK (voice IN ('default', 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer')),
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, locale, voice)
);

CREATE INDEX idx_audio_files_content ON audio_files(content_id, content_type);

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- Increment comment likes counter
CREATE OR REPLACE FUNCTION increment_comment_likes(comment_id UUID)
RETURNS VOID AS $$ 
BEGIN 
  UPDATE comments 
  SET likes_count = likes_count + 1 
  WHERE id = comment_id; 
END; 
$$ LANGUAGE plpgsql;

-- Decrement comment likes counter (with floor at 0)
CREATE OR REPLACE FUNCTION decrement_comment_likes(comment_id UUID)
RETURNS VOID AS $$ 
BEGIN 
  UPDATE comments 
  SET likes_count = GREATEST(likes_count - 1, 0) 
  WHERE id = comment_id; 
END; 
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bias_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE perspective_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;

-- Flashcards: Users can only see/edit their own
CREATE POLICY flashcards_select_own ON flashcards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY flashcards_insert_own ON flashcards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY flashcards_update_own ON flashcards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY flashcards_delete_own ON flashcards
  FOR DELETE USING (auth.uid() = user_id);

-- User Highlights: Users can only see/edit their own
CREATE POLICY highlights_select_own ON user_highlights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY highlights_insert_own ON user_highlights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY highlights_update_own ON user_highlights
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY highlights_delete_own ON user_highlights
  FOR DELETE USING (auth.uid() = user_id);

-- Comments: Everyone can read, only owners can delete
CREATE POLICY comments_select_all ON comments
  FOR SELECT USING (true);

CREATE POLICY comments_insert_authenticated ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY comments_update_own ON comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY comments_delete_own ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Comment Likes: Everyone can read, users can like
CREATE POLICY comment_likes_select_all ON comment_likes
  FOR SELECT USING (true);

CREATE POLICY comment_likes_insert_authenticated ON comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY comment_likes_delete_own ON comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Fact Checks: Everyone can read (public data)
CREATE POLICY fact_checks_select_all ON fact_checks
  FOR SELECT USING (true);

-- Bias Analyses: Everyone can read (public data)
CREATE POLICY bias_analyses_select_all ON bias_analyses
  FOR SELECT USING (true);

-- Perspective Summaries: Everyone can read (public data)
CREATE POLICY perspective_summaries_select_all ON perspective_summaries
  FOR SELECT USING (true);

-- Audio Files: Everyone can read (public data)
CREATE POLICY audio_files_select_all ON audio_files
  FOR SELECT USING (true);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_flashcards_updated_at
  BEFORE UPDATE ON flashcards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_highlights_updated_at
  BEFORE UPDATE ON user_highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Uncomment to insert test data:
-- INSERT INTO perspective_summaries (topic, perspectives, consensus, disagreements, synthesized_summary)
-- VALUES (
--   'GPT-5 Release',
--   '[{"source": "TechCrunch", "viewpoint": "Optimistic about capabilities"}]'::jsonb,
--   '["Most sources agree on Q1 2025 release"]'::jsonb,
--   '["Disagreement on pricing model"]'::jsonb,
--   'GPT-5 expected Q1 2025 with mixed opinions on pricing.'
-- );

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run with: supabase db push
-- Or via Supabase Dashboard > SQL Editor
-- =====================================================
