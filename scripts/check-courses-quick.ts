import { createClient } from '@supabase/supabase-js';

async function checkCourses() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Checking courses in database...\n');

  // Get all courses
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title_en, title_es, category, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching courses:', error);
    return;
  }

  console.log(`📚 Found ${courses?.length || 0} courses:\n`);
  
  courses?.forEach((course, index) => {
    console.log(`${index + 1}. ${course.title_en || course.title_es}`);
    console.log(`   ID: ${course.id}`);
    console.log(`   Status: ${course.status}`);
    console.log(`   Category: ${course.category}`);
    console.log(`   URL: https://ainews-platform.vercel.app/en/courses/${course.id}`);
    console.log('');
  });

  // Check for the specific "Femdom Sects" course
  const femdomCourse = courses?.find(c => 
    c.title_en?.toLowerCase().includes('femdom') || 
    c.title_es?.toLowerCase().includes('femdom') ||
    c.title_en?.toLowerCase().includes('sectas') ||
    c.title_es?.toLowerCase().includes('sectas')
  );

  if (femdomCourse) {
    console.log('🎯 Found "Femdom Sects" course:');
    console.log(`   ID: ${femdomCourse.id}`);
    console.log(`   Status: ${femdomCourse.status}`);
    
    // Check modules for this course
    const { data: modules, error: modulesError } = await supabase
      .from('course_modules')
      .select('id, title_en, title_es, order_index')
      .eq('course_id', femdomCourse.id)
      .order('order_index');

    if (modulesError) {
      console.error('❌ Error fetching modules:', modulesError);
    } else {
      console.log(`   Modules: ${modules?.length || 0}`);
      modules?.forEach(m => {
        console.log(`     - ${m.title_en || m.title_es}`);
      });
    }
  } else {
    console.log('⚠️ "Femdom Sects" course NOT found in database');
  }
}

checkCourses().catch(console.error);
