-- Module illustrations storage
CREATE TABLE IF NOT EXISTS module_illustrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('en', 'es')),
  style TEXT NOT NULL,
  model TEXT,
  provider TEXT DEFAULT 'gemini',
  prompt_summary TEXT,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_illustrations_module
  ON module_illustrations(module_id, locale, style, created_at DESC);

ALTER TABLE module_illustrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read module illustrations" ON module_illustrations
  FOR SELECT USING (true);

CREATE POLICY "Service insert module illustrations" ON module_illustrations
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service delete module illustrations" ON module_illustrations
  FOR DELETE USING (auth.role() = 'service_role');
