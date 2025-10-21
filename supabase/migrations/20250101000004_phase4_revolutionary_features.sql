-- Phase 4: Revolutionary Features Database Schema
-- AI Personalization Engine + Smart Summarization + Learning Paths

-- =====================================================
-- 1. USER INTERESTS TRACKING (for personalization)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'course')),
  content_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'search', 'like', 'bookmark', 'complete')),
  interaction_strength INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate interactions (same user + content + type)
  UNIQUE(user_id, content_id, interaction_type)
);

-- Indexes for efficient queries
CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX idx_user_interests_content ON user_interests(content_id, content_type);
CREATE INDEX idx_user_interests_created_at ON user_interests(created_at DESC);
CREATE INDEX idx_user_interests_user_strength ON user_interests(user_id, interaction_strength DESC);

-- RLS Policies
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own interests"
  ON user_interests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interests"
  ON user_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interests"
  ON user_interests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to user_interests"
  ON user_interests FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 2. ARTICLE SUMMARIES (multi-level caching)
-- =====================================================

CREATE TABLE IF NOT EXISTS article_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'course')),
  level TEXT NOT NULL CHECK (level IN ('tldr', 'quick', 'standard')),
  summary_text TEXT NOT NULL,
  key_points TEXT[] NOT NULL DEFAULT '{}',
  reading_time_seconds INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One summary per content + level
  UNIQUE(content_id, content_type, level)
);

-- Indexes
CREATE INDEX idx_article_summaries_content ON article_summaries(content_id, content_type);
CREATE INDEX idx_article_summaries_level ON article_summaries(level);

-- RLS (public read, service role write)
ALTER TABLE article_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read summaries"
  ON article_summaries FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage summaries"
  ON article_summaries FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 3. LEARNING PATHS (personalized curriculum)
-- =====================================================

CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title_en TEXT NOT NULL,
  title_es TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_es TEXT NOT NULL,
  target_role TEXT NOT NULL,
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'mixed')),
  estimated_total_hours INTEGER NOT NULL,
  modules JSONB NOT NULL, -- Array of modules with nested structure
  skills_covered TEXT[] NOT NULL,
  prerequisites TEXT[] NOT NULL DEFAULT '{}',
  learning_outcomes_en TEXT[] NOT NULL,
  learning_outcomes_es TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_learning_paths_user_id ON learning_paths(user_id);
CREATE INDEX idx_learning_paths_target_role ON learning_paths(target_role);
CREATE INDEX idx_learning_paths_difficulty ON learning_paths(difficulty_level);
CREATE INDEX idx_learning_paths_skills ON learning_paths USING GIN(skills_covered);

-- RLS
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own paths"
  ON learning_paths FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own paths"
  ON learning_paths FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own paths"
  ON learning_paths FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to learning_paths"
  ON learning_paths FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 4. LEARNING PATH PROGRESS TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS learning_path_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One progress record per user + path + module
  UNIQUE(user_id, path_id, module_id)
);

-- Indexes
CREATE INDEX idx_learning_path_progress_user ON learning_path_progress(user_id);
CREATE INDEX idx_learning_path_progress_path ON learning_path_progress(path_id);
CREATE INDEX idx_learning_path_progress_updated ON learning_path_progress(updated_at DESC);

-- RLS
ALTER TABLE learning_path_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
  ON learning_path_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON learning_path_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON learning_path_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to progress"
  ON learning_path_progress FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to track interaction with automatic strength scoring
CREATE OR REPLACE FUNCTION track_user_interaction(
  p_user_id UUID,
  p_content_type TEXT,
  p_content_id UUID,
  p_interaction_type TEXT
) RETURNS VOID AS $$
DECLARE
  v_strength INTEGER;
BEGIN
  -- Map interaction types to strength scores
  v_strength := CASE p_interaction_type
    WHEN 'view' THEN 1
    WHEN 'search' THEN 2
    WHEN 'like' THEN 3
    WHEN 'bookmark' THEN 4
    WHEN 'complete' THEN 5
    ELSE 1
  END;
  
  -- Insert or update interaction
  INSERT INTO user_interests (user_id, content_type, content_id, interaction_type, interaction_strength)
  VALUES (p_user_id, p_content_type, p_content_id, p_interaction_type, v_strength)
  ON CONFLICT (user_id, content_id, interaction_type)
  DO UPDATE SET
    interaction_strength = user_interests.interaction_strength + v_strength,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's top interests (categories)
CREATE OR REPLACE FUNCTION get_user_top_interests(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
) RETURNS TABLE(category TEXT, weight NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN ui.content_type = 'article' THEN na.category
      WHEN ui.content_type = 'course' THEN c.category
    END AS category,
    SUM(ui.interaction_strength * EXP(-EXTRACT(EPOCH FROM (NOW() - ui.created_at)) / (30 * 24 * 3600))) AS weight
  FROM user_interests ui
  LEFT JOIN news_articles na ON ui.content_id = na.id AND ui.content_type = 'article'
  LEFT JOIN courses c ON ui.content_id = c.id AND ui.content_type = 'course'
  WHERE ui.user_id = p_user_id
  GROUP BY category
  ORDER BY weight DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically mark module as complete when progress = 100
CREATE OR REPLACE FUNCTION update_module_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.progress >= 100 AND OLD.progress < 100 THEN
    NEW.completed_at := NOW();
  ELSIF NEW.progress < 100 THEN
    NEW.completed_at := NULL;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_module_completion
  BEFORE UPDATE ON learning_path_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_module_completion();

-- =====================================================
-- 6. SAMPLE DATA (for testing)
-- =====================================================

-- Insert sample user interests (for user testing)
-- Note: Replace with actual user IDs in production
-- INSERT INTO user_interests (user_id, content_type, content_id, interaction_type, interaction_strength)
-- VALUES 
--   ('00000000-0000-0000-0000-000000000000'::UUID, 'article', (SELECT id FROM news_articles LIMIT 1), 'view', 1),
--   ('00000000-0000-0000-0000-000000000000'::UUID, 'article', (SELECT id FROM news_articles LIMIT 1 OFFSET 1), 'like', 3);

COMMENT ON TABLE user_interests IS 'Tracks user interactions with content for personalization';
COMMENT ON TABLE article_summaries IS 'Caches multi-level summaries (tldr, quick, standard)';
COMMENT ON TABLE learning_paths IS 'AI-generated personalized learning curricula';
COMMENT ON TABLE learning_path_progress IS 'Tracks user progress through learning path modules';
