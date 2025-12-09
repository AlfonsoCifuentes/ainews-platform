#!/usr/bin/env tsx
/**
 * Run SQL migration to create course_covers table
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20241209_create_course_covers.sql'), 'utf8');

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  console.log('Running migration...');
  console.log(sql);

  // Execute raw SQL using rpc or direct query
  const { error } = await supabase.rpc('exec_sql', { query: sql });
  
  if (error) {
    console.error('Migration failed:', error);
    
    // Try alternative: run statements one by one
    console.log('\nTrying to run statements individually...');
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed || trimmed.startsWith('--')) continue;
      
      console.log(`\nExecuting: ${trimmed.slice(0, 60)}...`);
      // This won't work without a proper SQL execution endpoint
    }
    
    console.log('\n⚠️ Please run the SQL manually in Supabase Dashboard > SQL Editor');
    console.log('File: supabase/migrations/20241209_create_course_covers.sql');
  } else {
    console.log('✅ Migration completed successfully');
  }
}

main().catch(console.error);
