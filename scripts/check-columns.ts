#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase.from('course_modules').select('*').limit(1);
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('Course Modules Columns:', Object.keys(data?.[0] || {}));
}

main();
