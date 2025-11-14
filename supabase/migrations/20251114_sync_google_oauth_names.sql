-- ============================================================================
-- QUICK FIX: Sync Google OAuth names to existing user_profiles
-- Date: 2025-11-14
-- Purpose: Update display_name for users authenticated via Google
-- ============================================================================

-- Update all user profiles with Google OAuth data
UPDATE public.user_profiles
SET 
  display_name = COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'user_name',
    display_name
  ),
  full_name = COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    full_name
  ),
  avatar_url = COALESCE(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture',
    avatar_url
  ),
  updated_at = NOW()
FROM auth.users au
WHERE 
  user_profiles.id = au.id
  AND (
    -- Only update if currently has UUID-like display name
    display_name LIKE 'user_%'
    OR display_name IS NULL
  );

-- Show results
SELECT 
  id,
  display_name,
  full_name,
  avatar_url,
  updated_at
FROM public.user_profiles
WHERE display_name LIKE 'user_%' OR display_name IS NULL
ORDER BY updated_at DESC
LIMIT 10;
