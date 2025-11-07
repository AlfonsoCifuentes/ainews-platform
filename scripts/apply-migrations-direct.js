/**
 * Apply migrations directly to Supabase using SQL queries
 * Simpler approach - just execute the consolidated migration file
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Execute SQL using Supabase's postgres connection
 */
async function executeMigration() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                      ║');
  console.log('║              🚀 APPLYING SUPABASE MIGRATIONS                         ║');
  console.log('║                                                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📡 Connected to: ${SUPABASE_URL}`);
  
  // Read the consolidated migration file
  const migrationFile = path.join(__dirname, '..', 'supabase', 'APPLY_MIGRATIONS.sql');
  
  if (!fs.existsSync(migrationFile)) {
    console.error('❌ Migration file not found:', migrationFile);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(migrationFile, 'utf8');
  
  console.log(`\n📄 Read migration file (${sql.length} characters)`);
  console.log('🔄 Executing SQL...\n');
  
  try {
    // Split into individual statements for better error reporting
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements\n`);
    
    let executed = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and verification queries
      if (statement.includes('SELECT COUNT(*)') || 
          statement.includes('Migration complete') ||
          statement.startsWith('--')) {
        continue;
      }
      
      const preview = statement.substring(0, 50).replace(/\n/g, ' ') + '...';
      
      try {
        // Try to execute via RPC if available
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (error) {
          throw error;
        }
        
        executed++;
        console.log(`  ✅ [${i + 1}/${statements.length}] ${preview}`);
        
      } catch (err) {
        // If RPC doesn't work, that's okay - Supabase might not have that function
        // We'll verify tables exist at the end
        console.log(`  ⚠️  [${i + 1}/${statements.length}] ${err.message || 'Could not execute via RPC'}`);
      }
    }
    
    console.log(`\n✨ Processed ${executed} statements\n`);
    
  } catch (error) {
    console.error('\n❌ Error executing migration:', error.message);
    console.log('\n💡 TIP: You may need to apply this manually via Supabase SQL Editor');
    console.log('   File: supabase/APPLY_MIGRATIONS.sql');
    console.log('   URL: https://supabase.com/dashboard/project/_/sql/new\n');
  }
  
  // Verify tables were created
  console.log('━'.repeat(80));
  console.log('\n🔍 Verifying tables exist...\n');
  
  const tables = [
    'ai_prompts',
    'trending_cache', 
    'entity_relations',
    'citations'
  ];
  
  let verified = 0;
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`  ❌ ${table}: Not found or error (${error.message})`);
      } else {
        console.log(`  ✅ ${table}: Exists (${count || 0} rows)`);
        verified++;
      }
    } catch (err) {
      console.log(`  ❌ ${table}: ${err.message}`);
    }
  }
  
  console.log('\n━'.repeat(80));
  
  if (verified === tables.length) {
    console.log('\n🎉 SUCCESS! All tables verified!\n');
    
    // Check seed data
    const { count: promptCount } = await supabase
      .from('ai_prompts')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 ai_prompts has ${promptCount || 0} seed prompts`);
    
    if (promptCount >= 4) {
      console.log('\n✨ MIGRATION COMPLETE!\n');
      console.log('Next steps:');
      console.log('  • Test Learning Agent: npm run ai:learn');
      console.log('  • Test Trending: npm run ai:detect-trends');
      console.log('  • Test Entities: npm run ai:extract-entities\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  Seed data might be missing. Run the migration manually.\n');
    }
    
  } else {
    console.log(`\n⚠️  Only ${verified}/${tables.length} tables verified`);
    console.log('\n📋 MANUAL STEPS REQUIRED:');
    console.log('  1. Go to: https://supabase.com/dashboard/project/_/sql/new');
    console.log('  2. Copy ALL content from: supabase/APPLY_MIGRATIONS.sql');
    console.log('  3. Paste into SQL Editor');
    console.log('  4. Click RUN ▶️\n');
    process.exit(1);
  }
}

executeMigration().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
