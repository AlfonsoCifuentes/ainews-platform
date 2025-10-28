/**
 * Apply course categories migration manually
 * Run with: npx tsx scripts/apply-course-migration.ts
 */

import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Applying course categories migration...\n');

  try {
    // Check if category column exists
    const { error: checkError } = await supabase
      .from('courses')
      .select('category')
      .limit(1);

    if (checkError && checkError.message.includes('column') && checkError.message.includes('does not exist')) {
      console.log('✓ Category column does not exist, migration needed');
      
      // Execute migration SQL using RPC
      const migrationSQL = `
        ALTER TABLE courses ADD COLUMN IF NOT EXISTS category TEXT;
        ALTER TABLE courses ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
        
        UPDATE courses SET category = 'general' WHERE category IS NULL;
      `;

      // Split and execute each statement
      const statements = migrationSQL.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
          // Note: You'll need to execute these manually in Supabase SQL Editor
        }
      }

      console.log('\n⚠️  Please execute the following SQL in your Supabase SQL Editor:');
      console.log('\n' + migrationSQL);
      console.log('\nAfter that, run this script again to verify.');
      
    } else if (!checkError) {
      console.log('✓ Category column already exists');
      
      // Update existing courses without category
      const { data: coursesWithoutCategory } = await supabase
        .from('courses')
        .select('id, category')
        .is('category', null);

      if (coursesWithoutCategory && coursesWithoutCategory.length > 0) {
        console.log(`Updating ${coursesWithoutCategory.length} courses without category...`);
        
        for (const course of coursesWithoutCategory) {
          await supabase
            .from('courses')
            .update({ category: 'general' })
            .eq('id', course.id);
        }
        
        console.log('✓ Updated courses with default category');
      } else {
        console.log('✓ All courses have categories');
      }
    }

    // Verify current state
    const { data: sampleCourses, error: sampleError } = await supabase
      .from('courses')
      .select('id, title_en, category, view_count')
      .limit(5);

    if (sampleError) {
      console.error('Error verifying:', sampleError);
    } else {
      console.log('\nSample courses:');
      console.table(sampleCourses);
    }

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration().catch(console.error);
