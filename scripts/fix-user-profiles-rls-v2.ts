#!/usr/bin/env node

/**
 * Apply RLS fix for user_profiles table
 * This script safely applies the RLS migration even if policies already exist
 * Run: npx ts-node scripts/fix-user-profiles-rls-v2.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !serviceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function applyMigration() {
  console.log('🔧 Applying user_profiles RLS fix (v2)...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251114_fix_user_profiles_rls_v2.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Executing migration SQL...\n');

    // Execute SQL via RPC or direct query
    try {
      // Try using the exec_sql RPC first
      const { error } = await supabase.rpc('exec_sql', {
        sql_string: sql
      });

      if (error) {
        throw error;
      }

      console.log('✅ Migration applied successfully!\n');
    } catch {
      // If RPC fails, provide the SQL for manual execution
      console.log('⚠️  Could not execute via RPC. Please apply the following SQL manually:\n');
      console.log('═'.repeat(80));
      console.log(sql);
      console.log('═'.repeat(80));
      console.log('\n📋 Steps to apply manually:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Click "New Query"');
      console.log('3. Paste the SQL above');
      console.log('4. Click RUN (green button)');
      console.log('5. Wait for ✅ Success\n');
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    console.log('\n📋 Manual steps:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Click "New Query"');
    console.log('3. Paste the content of: supabase/migrations/20251114_fix_user_profiles_rls_v2.sql');
    console.log('4. Click RUN (green button)');
    console.log('5. Wait for ✅ Success\n');
    process.exit(1);
  }
}

applyMigration();
