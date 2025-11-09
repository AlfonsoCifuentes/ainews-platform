#!/usr/bin/env node
/**
 * Simple migration applier - Reads SQL and executes via Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL(sql: string): Promise<boolean> {
  try {
    // Use Supabase's raw SQL execution endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    });

    return response.ok;
  } catch (error) {
    console.error('SQL execution error:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Database Migration Tool\n');

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

  console.log('📋 SQL to execute manually in Supabase SQL Editor:\n');
  console.log('🔗 URL: https://supabase.com/dashboard/project/yabsciwdpblqzskfupnj/sql/new\n');
  console.log('=' .repeat(80));

  for (const migration of migrations) {
    const filePath = join(process.cwd(), 'supabase', 'migrations', migration.file);
    
    console.log(`\n-- ${migration.name}`);
    console.log(`-- File: ${migration.file}\n`);
    
    try {
      const sql = readFileSync(filePath, 'utf-8');
      console.log(sql);
      console.log('\n' + '='.repeat(80));
    } catch (error) {
      console.error(`❌ Could not read ${migration.file}:`, error);
    }
  }

  console.log('\n✅ Copy the SQL above and execute in Supabase SQL Editor');
  console.log('✅ After execution, run: npx tsx scripts/check-db-schema.ts');
}

main();
