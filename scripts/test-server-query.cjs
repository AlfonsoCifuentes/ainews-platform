const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testServerQuery() {
  const courseId = 'fee98e01-89fb-49b2-b0e7-adafe129069d';

  console.log('\n🔐 Testing server-side query (with service role)...\n');

  // Exact query from the page
  const { data: rawCourse, error } = await supabase
    .from('courses')
    .select(`
      *,
      course_modules (*)
    `)
    .eq('id', courseId)
    .single();

  if (error) {
    console.error('❌ Query error:', error);
    process.exit(1);
  }

  if (!rawCourse) {
    console.error('❌ No course returned');
    process.exit(1);
  }

  console.log('✅ Server query succeeded');
  console.log(`   Course ID: ${rawCourse.id}`);
  console.log(`   Title: ${rawCourse.title_en}`);
  console.log(`   Has course_modules: ${!!rawCourse.course_modules}`);
  console.log(`   course_modules length: ${rawCourse.course_modules?.length || 0}`);
  console.log(`   course_modules is array: ${Array.isArray(rawCourse.course_modules)}`);

  if (Array.isArray(rawCourse.course_modules) && rawCourse.course_modules.length > 0) {
    console.log(`\n   ✅ Modules found: ${rawCourse.course_modules.length}`);
    rawCourse.course_modules.slice(0, 2).forEach((m) => {
      console.log(`      - ${m.title_en}`);
    });
  } else {
    console.log('\n   ❌ course_modules is not an array or is empty');
    console.log('   Full course object keys:', Object.keys(rawCourse).join(', '));
  }
}

testServerQuery().catch(console.error);
