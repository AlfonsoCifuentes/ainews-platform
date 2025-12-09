-- Migration: Create course_covers table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.course_covers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  locale TEXT NOT NULL DEFAULT 'en',
  prompt TEXT,
  model TEXT,
  provider TEXT,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  source TEXT DEFAULT 'script',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, locale)
);

-- Enable RLS
ALTER TABLE public.course_covers ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for course covers" 
  ON public.course_covers 
  FOR SELECT 
  USING (true);

-- Service role full access
CREATE POLICY "Service role full access for course covers" 
  ON public.course_covers 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_course_covers_course_id ON public.course_covers(course_id);
