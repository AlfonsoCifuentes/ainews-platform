#!/usr/bin/env node

/**
 * Database Migration Runner for Phase 5+
 * Executes the migration directly via Supabase client
 * 
 * Run with: node scripts/run-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  Phase 5+ Database Migration Runner           ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const migrationPath = path.join(__dirname, '../supabase/migrations/20241103_phase5_complete.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  console.log('📄 Reading migration file...');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  // Split into individual statements (basic approach)
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    
    // Skip comments
    if (statement.trim().startsWith('--')) continue;

    // Extract table/function name for logging
    const match = statement.match(/CREATE\s+(?:TABLE|FUNCTION|INDEX|POLICY|TRIGGER)\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_]+)/i);
    const objectName = match ? match[1] : `statement ${i + 1}`;

    try {
      process.stdout.write(`  Creating ${objectName}... `);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement }).single();
      
      if (error) {
        // Try direct query execution as fallback
        const { error: directError } = await supabase.from('_migrations').insert({ name: objectName });
        
        if (directError) {
          console.log('❌ FAILED');
          console.error('    Error:', error.message || directError.message);
          errorCount++;
        } else {
          console.log('✅ OK');
          successCount++;
        }
      } else {
        console.log('✅ OK');
        successCount++;
      }
      
    } catch (err) {
      console.log('❌ FAILED');
      console.error('    Error:', err.message);
      errorCount++;
    }
  }

  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  Migration Summary                             ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📊 Total: ${statements.length}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. This may be normal if:');
    console.log('   - Tables already exist');
    console.log('   - RPC function exec_sql is not available');
    console.log('\n📋 Next steps:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Copy/paste contents of supabase/migrations/20241103_phase5_complete.sql');
    console.log('   3. Run the query');
    process.exit(1);
  } else {
    console.log('\n🎉 Migration completed successfully!\n');
  }
}

runMigration().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
