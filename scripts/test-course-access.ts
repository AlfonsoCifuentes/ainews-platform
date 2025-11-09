#!/usr/bin/env tsx
/**
 * Test course access with the actual frontend code
 */

import 'dotenv/config';

// Simulate server-side request
async function testCourseAccess() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Test course IDs from check-rls output
  const courseIds = [
    'a75b63f1-5e2a-46f1-bfb7-58a121c860bd', // n8n course
    '3067c233-dc28-4939-ac64-dad702e160e0', // n8n con IA
    'fa61acef-b1d1-4377-a3c5-e9e33cd9617b', // Sectas Femdom
  ];

  console.log('\n🧪 Testing course detail page access...\n');

  for (const id of courseIds) {
    console.log(`\n📖 Testing course: ${id}`);
    console.log(`   URL: /en/courses/${id}\n`);

    // Create a simple client (no SSR cookies needed for published courses)
    const { createClient } = await import('@supabase/supabase-js');
    const db = createClient(supabaseUrl, supabaseKey);

    const { data: course, error } = await db
      .from('courses')
      .select(`
        *,
        course_modules (
          id,
          title_en,
          title_es,
          description_en,
          description_es,
          order_index,
          duration_minutes,
          content_type,
          is_free
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error(`   ❌ ERROR:`, error.message);
      console.error(`   Code:`, error.code);
      console.error(`   Details:`, error.details);
    } else if (!course) {
      console.log(`   ⚠️  Course not found (would show 404)`);
    } else {
      console.log(`   ✅ SUCCESS!`);
      console.log(`   Title: ${course.title_en || course.title}`);
      console.log(`   Status: ${course.status}`);
      console.log(`   Modules: ${course.course_modules?.length || 0}`);
      console.log(`   Category: ${course.category}`);
      
      if (course.course_modules && course.course_modules.length > 0) {
        console.log(`   First module: ${course.course_modules[0].title_en}`);
      }
    }
  }

  console.log('\n✅ All tests complete!\n');
}

testCourseAccess().catch(console.error);
