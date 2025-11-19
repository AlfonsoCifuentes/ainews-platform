const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testQuery() {
  const courseId = 'fee98e01-89fb-49b2-b0e7-adafe129069d';

  console.log('\n📋 Testing Supabase nested query...\n');

  // Test the nested query - exact same as in the page
  console.log('Query: courses.select("*, course_modules(*)")\n');
  const { data: courseWithModules, error: nestedError } = await supabase
    .from('courses')
    .select(`
      *,
      course_modules (*)
    `)
    .eq('id', courseId)
    .single();

  if (nestedError) {
    console.error('❌ Error:', nestedError.message);
    console.error('   Code:', nestedError.code);
    process.exit(1);
  }

  if (!courseWithModules) {
    console.error('❌ No course found');
    process.exit(1);
  }

  console.log('✅ Query succeeded');
  console.log(`   Course: ${courseWithModules.title_en}`);
  console.log(`   course_modules type: ${typeof courseWithModules.course_modules}`);
  console.log(`   course_modules is array: ${Array.isArray(courseWithModules.course_modules)}`);
  console.log(`   Modules returned: ${courseWithModules.course_modules?.length || 0}`);

  if (courseWithModules.course_modules && courseWithModules.course_modules.length > 0) {
    console.log(`\n   First 3 modules:`);
    courseWithModules.course_modules.slice(0, 3).forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.title_en} (Order: ${m.order_index})`);
    });
  } else {
    console.error('\n❌ course_modules is empty or undefined!');
    console.error('   Raw data:', JSON.stringify(courseWithModules, null, 2).substring(0, 500));
  }
}

testQuery().catch(console.error);
