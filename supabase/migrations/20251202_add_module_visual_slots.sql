-- Visual slots suggested by LLMs for module content
CREATE TABLE IF NOT EXISTS module_visual_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('en', 'es')),
  slot_type TEXT NOT NULL CHECK (slot_type IN ('header', 'diagram', 'inline')),
  density TEXT NOT NULL DEFAULT 'balanced' CHECK (density IN ('minimal', 'balanced', 'immersive')),
  suggested_visual_style TEXT DEFAULT 'photorealistic' CHECK (suggested_visual_style IN ('photorealistic', 'anime', 'comic')),
  block_index INTEGER,
  heading TEXT,
  summary TEXT,
  reason TEXT,
  llm_payload JSONB DEFAULT '{}'::jsonb,
  provider TEXT,
  model TEXT,
  confidence NUMERIC(4,3) DEFAULT 0.750,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_visual_slots_module
  ON module_visual_slots(module_id, locale, slot_type);

ALTER TABLE module_visual_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public read module visual slots"
  ON module_visual_slots FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Service upsert module visual slots"
  ON module_visual_slots FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service manage module visual slots"
  ON module_visual_slots FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service delete module visual slots"
  ON module_visual_slots FOR DELETE
  USING (auth.role() = 'service_role');
