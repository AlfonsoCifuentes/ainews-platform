#!/usr/bin/env tsx
/**
 * Create course_covers table using Supabase
 * Run this BEFORE generate-course-images.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  console.log('Checking if course_covers table exists...\n');

  // Try to query the table - if it fails, we need to create it
  const { error: checkError } = await supabase
    .from('course_covers')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('✅ course_covers table already exists!');
    return;
  }

  if (checkError.code === 'PGRST205') {
    console.log('Table does not exist. Please create it manually in Supabase Dashboard.\n');
    console.log('Go to: https://supabase.com/dashboard/project/yabsciwdpblqzskfupnj/sql/new');
    console.log('\nPaste this SQL:\n');
    console.log(`
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

ALTER TABLE public.course_covers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for course covers" 
  ON public.course_covers FOR SELECT USING (true);

CREATE POLICY "Service role full access for course covers" 
  ON public.course_covers FOR ALL 
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_course_covers_course_id 
  ON public.course_covers(course_id);
    `);
    console.log('\n⚠️ After creating the table, run: npx tsx scripts/generate-course-images.ts');
  } else {
    console.error('Unexpected error:', checkError);
  }
}

main().catch(console.error);
