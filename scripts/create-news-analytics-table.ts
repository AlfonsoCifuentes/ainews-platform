/**
 * Direct SQL execution to create news_analytics table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createNewsAnalyticsTable() {
  console.log('📊 Creating news_analytics table...\n');

  const sql = fs.readFileSync(
    path.join(process.cwd(), 'supabase', 'migrations', '20250126_news_analytics.sql'),
    'utf-8'
  );

  try {
    // Execute the SQL directly
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Table might already exist or exec_sql might not be available
      // Try creating it through REST API as individual statements
      console.log('⚠️  exec_sql not available, trying alternative method...\n');
      
      // Create table using INSERT (Supabase REST API limitation workaround)
      const { error: createError } = await supabase
        .from('news_analytics')
        .select('id')
        .limit(1);

      if (createError && createError.code === 'PGRST204') {
        console.log('❌ Table does not exist. Please create it manually in Supabase dashboard.');
        console.log('\n📋 Copy this SQL and run it in SQL Editor:\n');
        console.log(sql);
        process.exit(1);
      }

      if (!createError) {
        console.log('✅ Table already exists!');
      }
    } else {
      console.log('✅ news_analytics table created successfully!');
    }

    // Verify table exists
    const { data, error: verifyError } = await supabase
      .from('news_analytics')
      .select('count')
      .limit(0);

    if (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
      process.exit(1);
    }

    console.log('✅ Table verified and ready to use!');

  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

createNewsAnalyticsTable()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
