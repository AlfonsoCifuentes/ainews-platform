import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const courseId = 'fa61acef-b1d1-4377-a3c5-e9e33cd9617b';
  
  // Check course thumbnail
  const { data: course } = await client
    .from('courses')
    .select('id, title_en, thumbnail_url')
    .eq('id', courseId)
    .single();
  console.log('Course:', JSON.stringify(course, null, 2));
  
  // Check course_covers table
  const { data: covers } = await client
    .from('course_covers')
    .select('*')
    .eq('course_id', courseId);
  console.log('Covers:', JSON.stringify(covers, null, 2));
  
  // List files in storage for this course
  const { data: files, error } = await client.storage
    .from('course-images')
    .list(courseId);
  console.log('Storage files:', JSON.stringify(files, null, 2));
  if (error) console.log('Storage error:', error);
}

check().catch(console.error);
