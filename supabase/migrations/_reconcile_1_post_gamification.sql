-- =====================================================
-- SCHEMA RECONCILIATION BLOCK 1
-- Runs after gamification_system creates badges table
-- Adds missing columns to user_badges (first def uses badge_type, 
-- but gamification functions need badge_id)
-- =====================================================

-- user_badges: add badge_id + progress (gamification system version)
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS badge_id UUID;
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- Add FK constraint safely (badges table now exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_badges_badge_id_fkey'
    AND table_name = 'user_badges'
  ) THEN
    BEGIN
      ALTER TABLE user_badges
        ADD CONSTRAINT user_badges_badge_id_fkey
        FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add user_badges_badge_id_fkey: %', SQLERRM;
    END;
  END IF;
END $$;
