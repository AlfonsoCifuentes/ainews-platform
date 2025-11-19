import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCourseModules() {
  const courseId = 'fee98e01-89fb-49b2-b0e7-adafe129069d';

  console.log(`\n🔍 Checking course: ${courseId}\n`);

  // Get course details
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title_en, title_es, created_at')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    console.error('❌ Course not found:', courseError);
    process.exit(1);
  }

  console.log(`✅ Course found: ${course.title_en}`);
  console.log(`   Created: ${course.created_at}\n`);

  // Get modules
  const { data: modules, error: modulesError } = await supabase
    .from('course_modules')
    .select('id, title_en, order_index')
    .eq('course_id', courseId)
    .order('order_index');

  if (modulesError) {
    console.error('❌ Error fetching modules:', modulesError);
    process.exit(1);
  }

  if (!modules || modules.length === 0) {
    console.warn('⚠️  NO MODULES FOUND for this course!\n');
    console.log('This is why the "Start" button doesn\'t appear.');
    console.log('You need to create modules for this course.\n');
    process.exit(1);
  }

  console.log(`✅ Found ${modules.length} module(s):\n`);
  modules.forEach((mod, idx) => {
    console.log(`   ${idx + 1}. ${mod.title_en} (Order: ${mod.order_index})`);
  });
  console.log('');
}

checkCourseModules().catch(console.error);
