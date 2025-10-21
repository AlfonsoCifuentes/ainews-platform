-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- NEWS ARTICLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Bilingual content
  title_en TEXT NOT NULL,
  title_es TEXT NOT NULL,
  summary_en TEXT NOT NULL,
  summary_es TEXT NOT NULL,
  content_en TEXT NOT NULL,
  content_es TEXT NOT NULL,
  
  -- Metadata
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source_url TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  blur_data_url TEXT,
  
  -- AI & Quality
  ai_generated BOOLEAN DEFAULT false,
  quality_score NUMERIC(3,2) DEFAULT 0.80 CHECK (quality_score >= 0 AND quality_score <= 1),
  reading_time_minutes INTEGER DEFAULT 5,
  
  -- Timestamps
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_news_published_at ON news_articles(published_at DESC);
CREATE INDEX idx_news_category ON news_articles(category);
CREATE INDEX idx_news_quality ON news_articles(quality_score DESC);
CREATE INDEX idx_news_tags ON news_articles USING GIN(tags);

-- ============================================
-- CONTENT EMBEDDINGS (for RAG)
-- ============================================
CREATE TABLE IF NOT EXISTS content_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL, -- 'article' | 'course' | 'module'
  content_id UUID NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for similarity search
CREATE INDEX idx_embeddings_content ON content_embeddings(content_type, content_id);
CREATE INDEX idx_embeddings_vector ON content_embeddings USING ivfflat (embedding vector_cosine_ops);

-- ============================================
-- COURSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Bilingual content
  title_en TEXT NOT NULL,
  title_es TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_es TEXT NOT NULL,
  
  -- Course metadata
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INTEGER NOT NULL,
  topics TEXT[] DEFAULT '{}',
  
  -- AI generation
  ai_generated BOOLEAN DEFAULT true,
  generation_prompt TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  
  -- Stats
  enrollment_count INTEGER DEFAULT 0,
  rating_avg NUMERIC(2,1) DEFAULT 0.0,
  completion_rate NUMERIC(3,2) DEFAULT 0.0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_courses_difficulty ON courses(difficulty);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_rating ON courses(rating_avg DESC);
CREATE INDEX idx_courses_topics ON courses USING GIN(topics);

-- ============================================
-- COURSE MODULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Order & structure
  order_index INTEGER NOT NULL,
  
  -- Bilingual content
  title_en TEXT NOT NULL,
  title_es TEXT NOT NULL,
  content_en TEXT NOT NULL,
  content_es TEXT NOT NULL,
  
  -- Module metadata
  type TEXT NOT NULL CHECK (type IN ('video', 'text', 'quiz', 'code', 'interactive')),
  estimated_time INTEGER NOT NULL, -- minutes
  resources JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(course_id, order_index)
);

-- Indexes
CREATE INDEX idx_modules_course ON course_modules(course_id, order_index);

-- ============================================
-- USER PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- Will reference auth.users when auth is implemented
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  
  -- Progress tracking
  completed BOOLEAN DEFAULT false,
  score NUMERIC(5,2), -- Quiz/test score
  time_spent INTEGER DEFAULT 0, -- seconds
  
  -- Timestamps
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, course_id, module_id)
);

-- Indexes
CREATE INDEX idx_progress_user ON user_progress(user_id);
CREATE INDEX idx_progress_course ON user_progress(course_id);

-- ============================================
-- AI SYSTEM LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Operation details
  action_type TEXT NOT NULL, -- 'news_curation', 'course_generation', 'translation', etc.
  model_used TEXT NOT NULL,
  
  -- Token usage
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  
  -- Execution details
  success BOOLEAN NOT NULL,
  error_message TEXT,
  execution_time INTEGER NOT NULL, -- milliseconds
  cost NUMERIC(10,6) DEFAULT 0.0, -- USD
  
  -- Timestamps
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_logs_action ON ai_system_logs(action_type);
CREATE INDEX idx_logs_timestamp ON ai_system_logs(timestamp DESC);
CREATE INDEX idx_logs_success ON ai_system_logs(success);

-- ============================================
-- AI FEEDBACK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Content reference
  content_type TEXT NOT NULL, -- 'article', 'course', 'module'
  content_id UUID NOT NULL,
  user_id UUID, -- Optional user reference
  
  -- Feedback data
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  ai_improvement_notes TEXT, -- What the AI learned from this
  
  -- Processing
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feedback_content ON ai_feedback(content_type, content_id);
CREATE INDEX idx_feedback_processed ON ai_feedback(processed);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_news_articles_updated_at
  BEFORE UPDATE ON news_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_modules_updated_at
  BEFORE UPDATE ON course_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function for similarity search (RAG)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  content_id UUID,
  similarity float,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    content_embeddings.id,
    content_embeddings.content_type,
    content_embeddings.content_id,
    1 - (content_embeddings.embedding <=> query_embedding) as similarity,
    content_embeddings.metadata
  FROM content_embeddings
  WHERE 1 - (content_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY content_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Public read access for published content
CREATE POLICY "Public read access for news" ON news_articles
  FOR SELECT USING (true);

CREATE POLICY "Public read access for courses" ON courses
  FOR SELECT USING (status = 'published');

CREATE POLICY "Public read access for modules" ON course_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_modules.course_id
      AND courses.status = 'published'
    )
  );

-- Service role full access (for AI agents and backend)
CREATE POLICY "Service role full access news" ON news_articles
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role full access courses" ON courses
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role full access logs" ON ai_system_logs
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- User-specific policies for progress
CREATE POLICY "Users can read own progress" ON user_progress
  FOR SELECT USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own progress" ON user_progress
  FOR ALL USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');
