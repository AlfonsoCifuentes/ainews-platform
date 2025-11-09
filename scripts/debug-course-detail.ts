/**
 * Inspect a single course with its modules for debugging 404 issues.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const courseId = process.argv[2];

if (!courseId) {
  console.error('Usage: npx tsx scripts/debug-course-detail.ts <course-id>');
  process.exit(1);
}

async function main() {
  const { data: course, error } = await supabase
    .from('courses')
    .select('*, course_modules(*)')
    .eq('id', courseId)
    .single();

  if (error) {
    console.error('Error fetching course:', error.message);
    return;
  }

  if (!course) {
    console.log('Course not found');
    return;
  }

  console.log({
    id: course.id,
    title_en: course.title_en,
    status: course.status,
    modules: course.course_modules?.length || 0,
  });

  if (course.course_modules && course.course_modules.length > 0) {
    console.log('Sample module keys:', Object.keys(course.course_modules[0]));
    console.log('Sample module preview:', {
      id: course.course_modules[0].id,
      type: course.course_modules[0].type,
      estimated_time: course.course_modules[0].estimated_time,
      hasContentEn: Boolean(course.course_modules[0].content_en?.length),
      hasDescriptionEn: 'description_en' in course.course_modules[0],
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
