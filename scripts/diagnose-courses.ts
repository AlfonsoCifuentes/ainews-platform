#!/usr/bin/env node
/**
 * Course System Diagnostic Script
 * Verifies course creation and access functionality
 */

import { getSupabaseServerClient } from '../lib/db/supabase.js';

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function runDiagnostics() {
  console.log('🔍 Running Course System Diagnostics...\n');

  const db = getSupabaseServerClient();
  let hasErrors = false;

  // Test 1: Check courses table structure
  console.log('1️⃣  Checking courses table structure...');
  try {
    const { data: courses, error } = await db
      .from('courses')
      .select('id, title_en, category, status, view_count, enrollment_count, rating_avg')
      .limit(1);

    if (error) {
      console.error('   ❌ Error:', error.message);
      hasErrors = true;
    } else {
      console.log('   ✅ Table structure OK');
      if (courses && courses.length > 0) {
        console.log('   📊 Sample course:', {
          id: courses[0].id.substring(0, 8) + '...',
          title: courses[0].title_en.substring(0, 40),
          category: courses[0].category,
          status: courses[0].status
        });
      }
    }
  } catch (err) {
    console.error('   ❌ Exception:', formatError(err));
    hasErrors = true;
  }

  // Test 2: Check published courses
  console.log('\n2️⃣  Checking published courses...');
  try {
    const { data: publishedCourses, error, count } = await db
      .from('courses')
      .select('*', { count: 'exact', head: false })
      .eq('status', 'published');

    if (error) {
      console.error('   ❌ Error:', error.message);
      hasErrors = true;
    } else {
      console.log(`   ✅ Found ${count || 0} published courses`);
      if (publishedCourses && publishedCourses.length > 0) {
        console.log('   📚 Categories:', [...new Set(publishedCourses.map(c => c.category))].join(', '));
      }
    }
  } catch (err) {
    console.error('   ❌ Exception:', formatError(err));
    hasErrors = true;
  }

  // Test 3: Check course modules
  console.log('\n3️⃣  Checking course modules...');
  try {
    const { data: modules, error } = await db
      .from('course_modules')
      .select('course_id, id, order_index, type')
      .limit(5);

    if (error) {
      console.error('   ❌ Error:', error.message);
      hasErrors = true;
    } else {
      console.log(`   ✅ Found ${modules?.length || 0} sample modules`);
      if (modules && modules.length > 0) {
        const coursesWithModules = [...new Set(modules.map(m => m.course_id))];
        console.log(`   📖 Modules span ${coursesWithModules.length} courses`);
      }
    }
  } catch (err) {
    console.error('   ❌ Exception:', formatError(err));
    hasErrors = true;
  }

  // Test 4: Test course detail query
  console.log('\n4️⃣  Testing course detail query...');
  try {
    const { data: sampleCourse } = await db
      .from('courses')
      .select('id')
      .eq('status', 'published')
      .limit(1)
      .single();

    if (sampleCourse) {
      const { data: courseWithModules, error } = await db
        .from('courses')
        .select(`
          *,
          course_modules (
            id,
            order_index,
            title_en,
            type,
            estimated_time
          )
        `)
        .eq('id', sampleCourse.id)
        .single();

      if (error) {
        console.error('   ❌ Error:', error.message);
        hasErrors = true;
      } else {
        console.log('   ✅ Course detail query successful');
        console.log(`   📚 Course has ${courseWithModules.course_modules?.length || 0} modules`);
      }
    } else {
      console.log('   ⚠️  No published courses to test with');
    }
  } catch (err) {
    console.error('   ❌ Exception:', formatError(err));
    hasErrors = true;
  }

  // Test 5: Check API keys for course generation
  console.log('\n5️⃣  Checking LLM API configuration...');
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasGroq = !!process.env.GROQ_API_KEY;

  if (hasGemini || hasOpenRouter || hasGroq) {
    console.log('   ✅ At least one LLM provider configured');
    if (hasGemini) console.log('   🔑 Gemini API: Configured');
    if (hasOpenRouter) console.log('   🔑 OpenRouter API: Configured');
    if (hasGroq) console.log('   🔑 Groq API: Configured');
  } else {
    console.log('   ⚠️  No LLM providers configured (course generation will fail)');
    console.log('   💡 Set GEMINI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY');
  }

  // Test 6: Check categories
  console.log('\n6️⃣  Checking course categories...');
  try {
    const { data: categoryCounts } = await db
      .from('courses')
      .select('category')
      .eq('status', 'published');

    if (categoryCounts) {
      const counts: Record<string, number> = {};
      categoryCounts.forEach(c => {
        counts[c.category] = (counts[c.category] || 0) + 1;
      });

      console.log('   ✅ Category distribution:');
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
          console.log(`      ${cat}: ${count} courses`);
        });
    }
  } catch (err) {
    console.error('   ❌ Exception:', formatError(err));
    hasErrors = true;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log('❌ Diagnostics completed with ERRORS');
    console.log('💡 Review the errors above and check your database migrations');
    process.exit(1);
  } else {
    console.log('✅ All diagnostics passed successfully!');
    console.log('🎉 Course system is ready to use');
    process.exit(0);
  }
}

runDiagnostics().catch(err => {
  console.error('\n💥 Fatal error running diagnostics:', err);
  process.exit(1);
});
