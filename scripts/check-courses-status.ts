/**
 * Script to check the status of all courses in the database
 * Usage: npx ts-node scripts/check-courses-status.ts
 */

import { getSupabaseServerClient } from '@/lib/db/supabase';

async function checkCoursesStatus() {
  console.log('🔍 Checking courses status...\n');
  
  try {
    const db = getSupabaseServerClient();
    
    // Get ALL courses regardless of status
    console.log('📋 Fetching ALL courses (no status filter)...');
    const { data: allCourses, error: allError } = await db
      .from('courses')
      .select('id, title_en, status, created_at, view_count');
    
    if (allError) {
      console.error('❌ Error fetching all courses:', allError);
      return;
    }
    
    console.log(`\n✅ Total courses in database: ${allCourses?.length || 0}\n`);
    
    if (!allCourses || allCourses.length === 0) {
      console.log('⚠️  No courses found in the database at all!');
      return;
    }
    
    // Group by status
    const byStatus: Record<string, any[]> = {};
    allCourses.forEach(course => {
      const status = course.status || 'null';
      if (!byStatus[status]) byStatus[status] = [];
      byStatus[status].push(course);
    });
    
    console.log('📊 Courses by status:');
    Object.entries(byStatus).forEach(([status, courses]) => {
      console.log(`  ${status}: ${courses.length} courses`);
    });
    
    console.log('\n📝 First 5 courses:');
    allCourses?.slice(0, 5).forEach((course, idx) => {
      console.log(`  ${idx + 1}. "${course.title_en}" - Status: "${course.status}", Views: ${course.view_count}`);
    });
    
    // Now check with status filter
    console.log('\n\n🔎 Fetching courses with status="published"...');
    const { data: publishedCourses, error: pubError } = await db
      .from('courses')
      .select('id, title_en, status')
      .eq('status', 'published');
    
    if (pubError) {
      console.error('❌ Error:', pubError);
      return;
    }
    
    console.log(`✅ Published courses: ${publishedCourses?.length || 0}`);
    
    if (!publishedCourses || publishedCourses.length === 0) {
      console.log('\n⚠️  PROBLEM FOUND: No courses have status="published"!');
      console.log('This is why courses aren\'t showing in the library.');
      console.log('\n💡 Solution: Update course status or remove the status filter from /app/api/courses/route.ts');
    }
    
  } catch (error) {
    console.error('🚨 Unexpected error:', error);
  }
}

checkCoursesStatus();
