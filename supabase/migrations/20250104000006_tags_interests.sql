-- Migration: Add user tags/interests for personalization
-- Date: 2025-01-04

-- tags table (predefined tags for content and user interests)
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50), -- 'topic', 'technology', 'industry', 'skill_level'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  INDEX (slug),
  INDEX (category)
);

-- user_interests (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_interests (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (user_id, tag_id),
  INDEX (user_id),
  INDEX (tag_id)
);

-- content_tags (many-to-many for articles/courses)
CREATE TABLE IF NOT EXISTS content_tags (
  content_id UUID NOT NULL,
  content_type VARCHAR(20) NOT NULL, -- 'article' | 'course'
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (content_id, tag_id),
  INDEX (tag_id),
  INDEX (content_type)
);

-- RLS Policies for tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tags"
  ON tags
  FOR SELECT
  USING (true);

-- RLS Policies for user_interests
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interests"
  ON user_interests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own interests"
  ON user_interests
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for content_tags
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view content tags"
  ON content_tags
  FOR SELECT
  USING (true);

-- Insert default tags
INSERT INTO tags (name, slug, category) VALUES
  ('Machine Learning', 'machine-learning', 'topic'),
  ('Deep Learning', 'deep-learning', 'topic'),
  ('Natural Language Processing', 'nlp', 'topic'),
  ('Computer Vision', 'computer-vision', 'topic'),
  ('Reinforcement Learning', 'reinforcement-learning', 'topic'),
  ('Neural Networks', 'neural-networks', 'topic'),
  ('Transformers', 'transformers', 'technology'),
  ('GPT', 'gpt', 'technology'),
  ('LLMs', 'llms', 'technology'),
  ('Diffusion Models', 'diffusion-models', 'technology'),
  ('PyTorch', 'pytorch', 'technology'),
  ('TensorFlow', 'tensorflow', 'technology'),
  ('Hugging Face', 'hugging-face', 'technology'),
  ('OpenAI', 'openai', 'industry'),
  ('Anthropic', 'anthropic', 'industry'),
  ('Google AI', 'google-ai', 'industry'),
  ('Meta AI', 'meta-ai', 'industry'),
  ('Beginner', 'beginner', 'skill_level'),
  ('Intermediate', 'intermediate', 'skill_level'),
  ('Advanced', 'advanced', 'skill_level'),
  ('Research', 'research', 'topic'),
  ('Ethics', 'ai-ethics', 'topic'),
  ('Safety', 'ai-safety', 'topic'),
  ('Agents', 'ai-agents', 'topic'),
  ('Robotics', 'robotics', 'topic')
ON CONFLICT (slug) DO NOTHING;

-- Comments
COMMENT ON TABLE tags IS 'Predefined tags for categorization and personalization';
COMMENT ON TABLE user_interests IS 'User interests for personalized recommendations';
COMMENT ON TABLE content_tags IS 'Tags assigned to articles and courses';
