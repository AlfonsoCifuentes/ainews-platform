-- ============================================================================
-- MIGRATION: Fix user_profiles RLS policies (v2 - Safe idempotent version)
-- Date: 2025-11-14
-- Issue: user_profiles returning 500 errors on SELECT/UPDATE
-- Reason: Overly restrictive RLS policies preventing client access
-- Note: This version safely handles partial migrations
-- ============================================================================

-- Drop all existing conflicting policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Public can view leaderboard" ON user_profiles;
DROP POLICY IF EXISTS "Public can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can select own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON user_profiles;

-- Re-enable RLS (in case it was disabled)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can VIEW all profiles (for leaderboards, discovery)
CREATE POLICY "Public can view all profiles v2"
  ON user_profiles FOR SELECT
  TO public
  USING (true);

-- Policy 2: Authenticated users can SELECT their own profile  
CREATE POLICY "Users can select own profile v2"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 3: Authenticated users can INSERT their own profile
CREATE POLICY "Users can insert own profile v2"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy 4: Authenticated users can UPDATE their own profile
CREATE POLICY "Users can update own profile v2"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 5: Service role has full access (for migrations, admin operations)
CREATE POLICY "Service role can manage all profiles v2"
  ON user_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Ensure auto-profile creation on signup
-- ============================================================================

-- Drop and recreate the trigger to ensure it always fires
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to create profile, silently ignore if it already exists
  INSERT INTO public.user_profiles (
    id, 
    display_name, 
    full_name, 
    avatar_url,
    preferred_locale,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'user_name',
      'user_' || substring(NEW.id::text, 1, 8)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      COALESCE(NEW.email, '')
    ),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
    COALESCE((NEW.raw_user_meta_data->>'locale')::TEXT, 'en'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Ensure all existing auth.users have a profile
-- ============================================================================
INSERT INTO public.user_profiles (id, display_name, full_name, created_at, updated_at)
SELECT 
  id,
  COALESCE(
    raw_user_meta_data->>'name',
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'user_name',
    'user_' || substring(id::text, 1, 8)
  ),
  COALESCE(
    raw_user_meta_data->>'name',
    raw_user_meta_data->>'full_name',
    COALESCE(email, 'User')
  ),
  created_at,
  created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;
