#!/usr/bin/env tsx
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
  const { data, error } = await db
    .from('course_modules')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('\n📋 course_modules schema:\n');
    if (data && data[0]) {
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('No modules found');
    }
  }
}

checkSchema();
