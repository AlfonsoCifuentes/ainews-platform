-- Check RLS policies on courses table

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'courses';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'courses';

-- EXPECTED POLICY:
-- There should be a policy allowing SELECT on published courses for everyone

-- If no policy exists, this is the ISSUE
-- Users can't read courses because RLS is blocking them

-- FIX: Create a policy to allow reading published courses
CREATE POLICY "Allow public read access to published courses"
ON courses
FOR SELECT
TO public
USING (status = 'published');

-- Also check course_modules
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'course_modules';

-- If course_modules also has RLS enabled, add policy
CREATE POLICY "Allow public read access to course modules"
ON course_modules
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = course_modules.course_id 
    AND courses.status = 'published'
  )
);
