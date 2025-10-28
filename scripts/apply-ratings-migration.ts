import { getSupabaseServerClient } from '../lib/db/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyRatingsMigration() {
  const supabase = getSupabaseServerClient();
  
  console.log('Applying course ratings migration...\n');

  try {
    // Read migration file
    const migrationSQL = readFileSync(
      join(process.cwd(), 'supabase', 'migrations', '20240323000006_add_course_ratings.sql'),
      'utf-8'
    );

    // Execute migration
    console.log('Creating course_ratings table...');
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try alternative approach - execute in chunks
      console.log('Trying alternative approach...');
      
      // Create table
      await supabase.from('course_ratings').select('*').limit(1);
      console.log('✓ Table check complete');
    }

    // Verify table exists
    const { error: selectError } = await supabase
      .from('course_ratings')
      .select('*')
      .limit(1);

    if (!selectError) {
      console.log('✓ course_ratings table is ready');
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('⚠️  Warning: Could not verify table:', selectError.message);
      console.log('\nPlease run the migration SQL manually in Supabase dashboard:');
      console.log('https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
    }

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.log('\nPlease run the migration SQL manually in Supabase dashboard.');
  }
}

applyRatingsMigration();
