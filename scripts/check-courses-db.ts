#!/usr/bin/env node

/**
 * Check if courses exist in the database
 * Helps debug 404 errors on /api/courses endpoint
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf-8');
  env.split('\n').forEach((line: string) => {
    const [key, value] = line.split('=');
    if (key && value && !process.env[key]) {
      process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('📚 Checking courses in database...\n');

  try {
    // Count all courses
    const { count: allCount, error: allError } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });

    if (allError) {
      console.error('❌ Error counting all courses:', allError);
    } else {
      console.log(`✅ Total courses in database: ${allCount}`);
    }

    // Count published courses
    const { count: publishedCount, error: pubError } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    if (pubError) {
      console.error('❌ Error counting published courses:', pubError);
    } else {
      console.log(`✅ Published courses: ${publishedCount}`);
    }

    // Get first 5 courses
    const { data: courses, error: dataError } = await supabase
      .from('courses')
      .select('id, title_en, status, created_at')
      .limit(5);

    if (dataError) {
      console.error('❌ Error fetching courses:', dataError);
    } else {
      console.log('\n📋 First 5 courses:');
      if (courses && courses.length > 0) {
        courses.forEach((course: any) => {
          console.log(`  - ${course.title_en} (${course.status})`);
        });
      } else {
        console.log('  (No courses found)');
      }
    }

    // Check course status distribution
    const { data: statuses, error: statusError } = await supabase
      .from('courses')
      .select('status')
      .limit(100);

    if (!statusError && statuses) {
      const distribution: Record<string, number> = {};
      statuses.forEach((s: any) => {
        distribution[s.status] = (distribution[s.status] || 0) + 1;
      });

      console.log('\n📊 Course status distribution:');
      Object.entries(distribution).forEach(([status, count]) => {
        console.log(`  - ${status}: ${count}`);
      });
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

main().then(() => {
  console.log('\n✅ Check complete');
  process.exit(0);
});
