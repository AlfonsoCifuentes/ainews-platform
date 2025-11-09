#!/usr/bin/env node
/**
 * Execute migrations statement by statement using Supabase client
 * This works by splitting SQL into individual statements and executing them
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function splitSQL(sql: string): string[] {
  // Remove comments
  sql = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Split by semicolons
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 5) // Filter out very short strings
    .map(s => s + ';'); // Re-add semicolon
  
  return statements;
}

async function executeMigration(filePath: string, name: string): Promise<boolean> {
  console.log(`\n📝 Applying: ${name}`);
  console.log(`   File: ${filePath}\n`);

  try {
    const sql = readFileSync(filePath, 'utf-8');
    const statements = splitSQL(sql);
    
    console.log(`   Found ${statements.length} SQL statements`);
    
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      
      if (!statement || statement.length < 10) {
        continue;
      }
      
      // Show abbreviated statement
      const preview = statement.replace(/\s+/g, ' ').slice(0, 80);
      process.stdout.write(`   [${i + 1}/${statements.length}] ${preview}... `);
      
      try {
        // Execute SQL using Supabase's RPC endpoint
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ query: statement })
        });

        if (response.ok) {
          console.log('✅');
          successCount++;
        } else if (response.status === 404) {
          // RPC function doesn't exist - this is expected for most Supabase instances
          // We need to use a different approach
          console.log('⚠️ (RPC not available)');
          return false;
        } else {
          const errorText = await response.text();
          if (errorText.includes('already exists') || errorText.includes('duplicate')) {
            console.log('⚠️ (already exists)');
            skipCount++;
          } else {
            console.log(`❌ ${errorText.slice(0, 100)}`);
            return false;
          }
        }
      } catch (error) {
        console.log(`❌ ${error instanceof Error ? error.message.slice(0, 100) : 'Unknown error'}`);
        return false;
      }
    }
    
    console.log(`\n   ✅ Migration complete: ${successCount} executed, ${skipCount} skipped\n`);
    return true;
    
  } catch (error) {
    console.error(`   ❌ Failed to read or execute migration:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Applying database migrations programmatically...\n');

  const migrations = [
    {
      file: join(process.cwd(), 'supabase', 'migrations', '20251104_add_image_metadata.sql'),
      name: 'Add image metadata columns to news_articles'
    },
    {
      file: join(process.cwd(), 'supabase', 'migrations', '20251109_create_image_visual_hashes.sql'),
      name: 'Create image_visual_hashes table'
    }
  ];

  let allSuccess = true;

  for (const migration of migrations) {
    const success = await executeMigration(migration.file, migration.name);
    if (!success) {
      allSuccess = false;
      console.log(`\n⚠️  Automatic execution failed for this migration.`);
      break;
    }
  }

  if (!allSuccess) {
    console.log('\n' + '='.repeat(80));
    console.log('📋 MANUAL MIGRATION REQUIRED');
    console.log('='.repeat(80));
    console.log('\n1. Open Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/yabsciwdpblqzskfupnj/sql/new\n');
    console.log('2. Run: npx tsx scripts/show-migrations.ts');
    console.log('3. Copy and paste the SQL shown');
    console.log('4. Click "Run" in Supabase\n');
    process.exit(1);
  } else {
    console.log('🎉 All migrations applied successfully!\n');
    console.log('✅ Verify with: npx tsx scripts/check-db-schema.ts');
  }
}

main();
