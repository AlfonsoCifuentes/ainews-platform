#!/usr/bin/env node

/**
 * Direct database script to update course modules with comprehensive content
 * This script bypasses API authentication issues by updating Supabase directly
 */

const { createClient } = require('@supabase/supabase-js');
const courseContent = require('./course-content-data.cjs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ML Course ID from previous diagnostic
const ML_COURSE_ID = 'fee98e01-89fb-49b2-b0e7-adafe129069d';

async function updateCourseContent() {
  console.log('🚀 Updating course content with comprehensive modules...\n');
  
  try {
    // Fetch the course with all modules
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title_en, title_es, course_modules(id, module_number, title_en, title_es)')
      .eq('id', ML_COURSE_ID)
      .single();

    if (courseError) {
      console.error('❌ Error fetching course:', courseError.message);
      process.exit(1);
    }

    if (!course) {
      console.error('❌ Course not found');
      process.exit(1);
    }

    console.log(`📚 Course: ${course.title_en}`);
    console.log(`📝 Total modules: ${course.course_modules.length}\n`);

    let successCount = 0;
    let errorCount = 0;

    // Update each module
    for (const module of course.course_modules) {
      const contentData = courseContent.modules[module.module_number - 1];
      
      if (!contentData) {
        console.log(`⚠️  Module ${module.module_number}: No content data available`);
        continue;
      }

      console.log(`📝 Updating Module ${module.module_number}: ${contentData.title}...`);

      const { error } = await supabase
        .from('course_modules')
        .update({
          content_en: contentData.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', module.id);

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Updated (${contentData.content.length} characters)`);
        successCount++;
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n✅ Update complete!`);
    console.log(`   ✓ Successful: ${successCount}`);
    console.log(`   ✗ Failed: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 All modules updated with comprehensive content!');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

updateCourseContent();
