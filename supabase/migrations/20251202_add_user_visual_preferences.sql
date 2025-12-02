ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS preferred_visual_style TEXT NOT NULL DEFAULT 'photorealistic'
    CHECK (preferred_visual_style IN ('photorealistic', 'anime', 'comic')),
  ADD COLUMN IF NOT EXISTS preferred_visual_density TEXT NOT NULL DEFAULT 'balanced'
    CHECK (preferred_visual_density IN ('minimal', 'balanced', 'immersive')),
  ADD COLUMN IF NOT EXISTS auto_diagramming BOOLEAN NOT NULL DEFAULT true;
