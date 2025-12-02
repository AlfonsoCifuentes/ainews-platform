ALTER TABLE module_illustrations
  ADD COLUMN IF NOT EXISTS visual_style TEXT NOT NULL DEFAULT 'photorealistic'
    CHECK (visual_style IN ('photorealistic', 'anime', 'comic')),
  ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES module_visual_slots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS anchor JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS checksum TEXT;

CREATE INDEX IF NOT EXISTS idx_module_illustrations_compound
  ON module_illustrations(module_id, locale, style, visual_style, created_at DESC);
