-- =====================================================
-- USER PROFILE & GAMIFICATION SYSTEM
-- Migration: Complete user system with profiles, courses, progress, XP, achievements
-- Created: 2025-01-03
-- NOTE: This migration extends the existing user_profiles table from 20250101000002
-- =====================================================

-- =====================================================
-- 1. EXTEND EXISTING USER PROFILES TABLE
-- =====================================================
-- The table already exists from migration 20250101000002_user_auth_gamification.sql
-- We just add any missing columns needed for this system

-- Add full_name column if it doesn't exist (maps to existing display_name)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_profiles' 
                 AND column_name = 'full_name') THEN
    ALTER TABLE user_profiles ADD COLUMN full_name TEXT;
  END IF;
END $$;

-- Add theme column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_profiles' 
                 AND column_name = 'theme') THEN
    ALTER TABLE user_profiles ADD COLUMN theme TEXT DEFAULT 'dark';
  END IF;
END $$;

-- Indexes (using existing columns: display_name, level, total_xp)
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_level ON user_profiles(level DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_xp ON user_profiles(total_xp DESC);

-- RLS Policies (already exist from previous migration, but ensure they're set)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup (update to use existing columns)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a minimal profile for the new auth user using existing column names
  INSERT INTO public.user_profiles (id, display_name, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', COALESCE(NEW.email, '')),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Re-create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =====================================================
-- 2. USER COURSES TABLE (Enrolled + Created)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'created' or 'enrolled'
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  progress_percentage INTEGER DEFAULT 0, -- 0-100
  
  -- Constraints
  UNIQUE(user_id, course_id, relationship_type),
  CONSTRAINT valid_relationship CHECK (relationship_type IN ('created', 'enrolled')),
  CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- Indexes
CREATE INDEX idx_user_courses_user ON user_courses(user_id);
CREATE INDEX idx_user_courses_course ON user_courses(course_id);
CREATE INDEX idx_user_courses_type ON user_courses(relationship_type);
CREATE INDEX idx_user_courses_progress ON user_courses(progress_percentage);

-- RLS Policies
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own courses"
  ON user_courses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own courses"
  ON user_courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own courses"
  ON user_courses FOR UPDATE
  USING (auth.uid() = user_id);


-- =====================================================
-- 3. USER PROGRESS TABLE (Per Module)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  score INTEGER, -- Quiz score if applicable (0-100)
  time_spent INTEGER DEFAULT 0, -- Seconds spent on module
  notes TEXT, -- User personal notes
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, course_id, module_id),
  CONSTRAINT valid_score CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

-- Indexes
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_user_progress_course ON user_progress(course_id);
CREATE INDEX idx_user_progress_completed ON user_progress(completed);

-- RLS Policies
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);


-- =====================================================
-- 4. USER XP LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_xp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  action_type TEXT NOT NULL, -- 'module_complete', 'course_create', 'article_read', etc
  reference_id UUID, -- course_id, article_id, etc
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_xp CHECK (xp_amount > 0)
);

-- Indexes
CREATE INDEX idx_user_xp_log_user ON user_xp_log(user_id);
CREATE INDEX idx_user_xp_log_action ON user_xp_log(action_type);
CREATE INDEX idx_user_xp_log_created ON user_xp_log(created_at DESC);

-- RLS Policies
ALTER TABLE user_xp_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own xp log"
  ON user_xp_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert xp log"
  ON user_xp_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to award XP and update user profile (use existing column: total_xp)
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_action_type TEXT,
  p_reference_id UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_new_total INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Insert XP log
  INSERT INTO user_xp_log (user_id, xp_amount, action_type, reference_id)
  VALUES (p_user_id, p_xp_amount, p_action_type, p_reference_id);
  
  -- Update user profile total XP (using existing column: total_xp)
  UPDATE user_profiles
  SET total_xp = total_xp + p_xp_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING total_xp INTO v_new_total;
  
  -- Calculate new level (exponential curve: level = floor(sqrt(total_xp / 100)))
  v_new_level := FLOOR(SQRT(v_new_total / 100.0)) + 1;
  
  -- Update level if changed
  UPDATE user_profiles
  SET level = v_new_level
  WHERE id = p_user_id AND level <> v_new_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 5. USER ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL, -- Badge identifier (e.g., 'first_course', 'speed_reader')
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, achievement_id)
);

-- Indexes
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement ON user_achievements(achievement_id);

-- RLS Policies
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- =====================================================
-- 6. AUTO-UPDATE FUNCTIONS
-- =====================================================

-- Update course progress percentage when module progress changes
CREATE OR REPLACE FUNCTION update_course_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_total_modules INTEGER;
  v_completed_modules INTEGER;
  v_new_progress INTEGER;
BEGIN
  -- Count total modules in course
  SELECT COUNT(*) INTO v_total_modules
  FROM course_modules
  WHERE course_id = NEW.course_id;
  
  -- Count completed modules by user
  SELECT COUNT(*) INTO v_completed_modules
  FROM user_progress
  WHERE user_id = NEW.user_id 
    AND course_id = NEW.course_id 
    AND completed = true;
  
  -- Calculate percentage
  IF v_total_modules > 0 THEN
    v_new_progress := (v_completed_modules * 100) / v_total_modules;
  ELSE
    v_new_progress := 0;
  END IF;
  
  -- Update user_courses progress
  UPDATE user_courses
  SET 
    progress_percentage = v_new_progress,
    last_accessed_at = NOW(),
    completed_at = CASE WHEN v_new_progress = 100 THEN NOW() ELSE NULL END
  WHERE user_id = NEW.user_id 
    AND course_id = NEW.course_id 
    AND relationship_type = 'enrolled';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_module_progress_update
  AFTER INSERT OR UPDATE ON user_progress
  FOR EACH ROW
  WHEN (NEW.completed = true)
  EXECUTE FUNCTION update_course_progress();


-- =====================================================
-- 7. STORAGE BUCKET FOR AVATARS
-- =====================================================

-- Create storage bucket (run via Supabase dashboard or API)
-- Bucket name: 'avatars'
-- Public: true
-- File size limit: 100KB
-- Allowed MIME types: image/jpeg

-- Storage policies (these need to be created in Supabase dashboard)
-- Policy 1: "Users can upload own avatar"
--   Operation: INSERT
--   Policy Definition: (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])

-- Policy 2: "Anyone can view avatars"
--   Operation: SELECT
--   Policy Definition: bucket_id = 'avatars'

-- Policy 3: "Users can update own avatar"
--   Operation: UPDATE
--   Policy Definition: (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])


-- =====================================================
-- 8. CREATE PROFILES FOR EXISTING USERS
-- =====================================================

-- Create profiles for any existing users that don't have one. This is
-- idempotent and safe to run multiple times. Uses existing column names.
INSERT INTO public.user_profiles (id, display_name, full_name, created_at, updated_at)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'display_name', 'user_' || substring(au.id::text, 1, 8)) AS display_name,
  COALESCE(au.raw_user_meta_data->>'full_name', COALESCE(au.email, '')) AS full_name,
  NOW() AS created_at,
  NOW() AS updated_at
FROM auth.users au
ON CONFLICT (id) DO NOTHING;


-- =====================================================
-- 9. SEED DATA - ACHIEVEMENT DEFINITIONS
-- =====================================================

-- Note: Achievement definitions will be in code (lib/gamification/achievements.ts)
-- Examples:
-- - first_course: "Created your first course"
-- - first_completion: "Completed your first course"
-- - speed_reader: "Read 10 articles in one day"
-- - knowledge_seeker: "Enrolled in 5 courses"
-- - perfectionist: "Scored 100% on a quiz"
-- - early_adopter: "Joined in the first month"
-- - educator: "Created 10 courses"
-- - dedicated_learner: "7-day learning streak"


-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Tables created: 5 (user_profiles, user_courses, user_progress, user_xp_log, user_achievements)
-- Functions created: 3 (handle_new_user, award_xp, update_course_progress)
-- Triggers created: 2 (on_auth_user_created, on_module_progress_update)
-- Storage bucket: avatars (create manually)
-- =====================================================
