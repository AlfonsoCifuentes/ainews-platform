import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const courseId = 'fa61acef-b1d1-4377-a3c5-e9e33cd9617b';
  console.log('Course ID:', courseId);

  // Course thumbnail
  const { data: course } = await client
    .from('courses')
    .select('id, title_en, thumbnail_url')
    .eq('id', courseId)
    .single();
  console.log('Course record:', course);

  // Course covers
  const { data: covers } = await client
    .from('course_covers')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });
  console.log('Course covers:', covers);

  // Module images (illustrations table?)
  const { data: illustrations } = await client
    .from('module_illustrations')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });
  console.log('Module illustrations:', illustrations);

  // Module list
  const { data: modules } = await client
    .from('course_modules')
    .select('id, title_en, thumbnail_url, content_type')
    .eq('course_id', courseId)
    .order('order_index');
  console.log('Modules:', modules);
}

run().catch(console.error);
