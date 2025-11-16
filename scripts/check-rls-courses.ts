#!/usr/bin/env node

/**
 * Check RLS policies for courses table
 * Verify that public read access is enabled
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Checking RLS policies for courses table...\n');

  try {
    // First, check if we can read courses
    const { data, error } = await supabase
      .from('courses')
      .select('id, title_en, status')
      .limit(1);

    if (error) {
      console.error('❌ Error reading courses:', error);
      console.log('\n⚠️  The courses table may have RLS policies preventing read access');
    } else {
      console.log('✅ Service role can read courses');
      if (data && data.length > 0) {
        console.log(`   Sample: ${data[0].title_en} (${data[0].status})`);
      }
    }

    // Test with anon key
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anonKey && supabaseUrl) {
      const anonClient = createClient(supabaseUrl, anonKey);
      const { data: anonData, error: anonError } = await anonClient
        .from('courses')
        .select('id, title_en, status')
        .eq('status', 'published')
        .limit(1);

      if (anonError) {
        console.error('❌ Anon key cannot read courses:', anonError.message);
        console.log('   This is likely a RLS policy issue');
      } else {
        console.log('✅ Anon key CAN read published courses');
        if (anonData && anonData.length > 0) {
          console.log(`   Sample: ${anonData[0].title_en}`);
        }
      }
    }

    // Count courses by status
    const { data: allCourses } = await supabase
      .from('courses')
      .select('id, status');

    if (allCourses) {
      const statusCount: Record<string, number> = {};
      (allCourses as Array<{ id: string; status: string }>).forEach((c) => {
        statusCount[c.status] = (statusCount[c.status] || 0) + 1;
      });

      console.log('\n📊 Courses by status:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count}`);
      });
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

main().then(() => {
  console.log('\n✅ RLS check complete');
  process.exit(0);
});
