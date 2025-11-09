#!/usr/bin/env node
/**
 * Apply migrations using Supabase Management API
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!supabaseUrl || !supabaseKey || !projectRef) {
  console.error('❌ Missing Supabase credentials or invalid URL');
  process.exit(1);
}

async function executeSQL(sql: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Use Supabase's PostgREST API to execute raw SQL
    // We'll use a trick: create a temporary function and call it
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

async function createExecFunction() {
  // First, try to create a function that can execute arbitrary SQL
  const createFunctionSQL = `
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
`;

  console.log('📝 Creating exec_sql function...');
  
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({ sql: createFunctionSQL })
  });

  if (response.ok) {
    console.log('✅ exec_sql function created\n');
    return true;
  } else {
    console.log('⚠️  Could not create exec_sql function (may already exist or API limitation)\n');
    return false;
  }
}

async function main() {
  console.log('🚀 Attempting automatic migration...\n');

  // Try to create the exec function
  await createExecFunction();

  const migrations = [
    {
      file: '20251104_add_image_metadata.sql',
      name: 'Add image metadata columns'
    },
    {
      file: '20251109_create_image_visual_hashes.sql',
      name: 'Create visual similarity table'
    }
  ];

  console.log('📋 Attempting to apply migrations via API...\n');

  for (const migration of migrations) {
    console.log(`📝 ${migration.name}`);
    const filePath = join(process.cwd(), 'supabase', 'migrations', migration.file);
    const sql = readFileSync(filePath, 'utf-8');

    const result = await executeSQL(sql);

    if (result.success) {
      console.log(`   ✅ Applied successfully\n`);
    } else {
      console.log(`   ❌ API execution not available\n`);
      console.log(`   ${result.error}\n`);
    }
  }

  console.log('\n⚠️  If automatic application failed, please apply manually:');
  console.log('🔗 https://supabase.com/dashboard/project/yabsciwdpblqzskfupnj/sql/new');
  console.log('\nRun: npx tsx scripts/show-migrations.ts');
}

main();
