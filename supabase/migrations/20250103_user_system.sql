-- =====================================================
-- USER PROFILE & GAMIFICATION SYSTEM
-- Migration: Complete user system with profiles, courses, progress, XP, achievements
-- Created: 2025-01-03
-- =====================================================

-- =====================================================
-- 1. USER PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT, -- Supabase Storage URL (JPG ≤100KB)
  bio TEXT,
  locale TEXT DEFAULT 'en', -- User preferred language
  theme TEXT DEFAULT 'dark', -- dark/light
  xp_total INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT bio_length CHECK (char_length(bio) <= 500)
);

-- Indexes
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_level ON user_profiles(level DESC);
CREATE INDEX idx_user_profiles_xp ON user_profiles(xp_total DESC);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Function to award XP and update user profile
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
  
  -- Update user profile total XP
  UPDATE user_profiles
  SET xp_total = xp_total + p_xp_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING xp_total INTO v_new_total;
  
  -- Calculate new level (exponential curve: level = floor(sqrt(xp_total / 100)))
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
-- 8. SEED DATA - ACHIEVEMENT DEFINITIONS
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
