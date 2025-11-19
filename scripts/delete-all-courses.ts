/**
 * Delete all courses from Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteCourses() {
  console.log('🗑️  Deleting all courses...\n');

  try {
    // Get all courses first
    const { data: courses, error: fetchError } = await supabase
      .from('courses')
      .select('id');

    if (fetchError) {
      console.error('❌ Error fetching courses:', fetchError);
      process.exit(1);
    }

    console.log(`Found ${courses?.length || 0} courses`);

    if (!courses || courses.length === 0) {
      console.log('✅ No courses to delete');
      process.exit(0);
    }

    // Delete by truncating the table
    const { error } = await supabase.rpc('truncate_courses');

    if (error && error.message.includes('does not exist')) {
      // Fallback: delete one by one
      for (const course of courses) {
        const { error: delError } = await supabase
          .from('courses')
          .delete()
          .eq('id', course.id);

        if (delError) {
          console.error(`❌ Error deleting course ${course.id}:`, delError);
        }
      }
      console.log('✅ All courses deleted (one by one)');
    } else if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    } else {
      console.log('✅ All courses deleted (truncated)');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteCourses();
