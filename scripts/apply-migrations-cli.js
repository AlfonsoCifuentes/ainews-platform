/**
 * Apply pending migrations to Supabase using the service role key
 * This script reads migration files and executes them directly
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

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migration files to apply (in order)
const MIGRATIONS = [
  '20250107000001_learning_agent.sql',
  '20250107000002_trending_cache.sql',
  '20250107000003_entity_relations.sql'
];

/**
 * Split SQL file into individual statements
 */
function splitSqlStatements(sql) {
  // Remove comments
  sql = sql.replace(/--[^\n]*\n/g, '\n');
  
  // Split by semicolon, but preserve them in function definitions
  const statements = [];
  let current = '';
  let inFunction = false;
  
  sql.split('\n').forEach(line => {
    current += line + '\n';
    
    // Track if we're inside a function definition
    if (line.match(/CREATE.*FUNCTION/i) || line.match(/CREATE.*TRIGGER/i)) {
      inFunction = true;
    }
    
    // End of statement
    if (line.includes(';') && !inFunction) {
      statements.push(current.trim());
      current = '';
    }
    
    // End of function
    if (line.match(/\$\$\s*LANGUAGE/i) || line.match(/END\s*\$\$/i)) {
      inFunction = false;
    }
  });
  
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  return statements.filter(s => s.length > 0 && !s.match(/^\s*--/));
}

/**
 * Execute a SQL statement
 */
async function executeSQL(sql, description = '') {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct query
      const { error: queryError } = await supabase.from('_temp').select('*').limit(0);
      if (queryError && queryError.code === 'PGRST204') {
        // Try using the postgres REST API directly
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({ sql_query: sql })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
      } else {
        throw error;
      }
    }
    
    console.log(`  ✅ ${description || 'Statement executed'}`);
    return true;
    
  } catch (error) {
    console.error(`  ❌ ${description || 'Statement failed'}: ${error.message}`);
    return false;
  }
}

/**
 * Apply a single migration file
 */
async function applyMigration(filename) {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename);
  
  console.log(`\n📄 Applying: ${filename}`);
  console.log('━'.repeat(80));
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`  ❌ File not found: ${migrationPath}`);
    return false;
  }
  
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const statements = splitSqlStatements(sql);
  
  console.log(`  Found ${statements.length} SQL statements`);
  
  let successCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 60).replace(/\n/g, ' ') + '...';
    
    const success = await executeSQL(statement, `Statement ${i + 1}/${statements.length}: ${preview}`);
    if (success) successCount++;
  }
  
  console.log(`\n  Result: ${successCount}/${statements.length} statements executed successfully`);
  
  return successCount === statements.length;
}

/**
 * Verify migration was applied
 */
async function verifyMigration(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`  ⚠️  Table ${tableName} might not exist yet: ${error.message}`);
      return false;
    }
    
    console.log(`  ✅ Table ${tableName} exists (${count || 0} rows)`);
    return true;
    
  } catch (error) {
    console.log(`  ⚠️  Could not verify ${tableName}: ${error.message}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                      ║');
  console.log('║              🚀 SUPABASE MIGRATIONS - AUTO APPLY                     ║');
  console.log('║                                                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📡 Connected to: ${SUPABASE_URL}`);
  console.log(`🔑 Using service role key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`);
  
  let successCount = 0;
  
  for (const migration of MIGRATIONS) {
    const success = await applyMigration(migration);
    if (success) successCount++;
  }
  
  console.log('\n━'.repeat(80));
  console.log(`\n✨ MIGRATION SUMMARY: ${successCount}/${MIGRATIONS.length} migrations applied\n`);
  
  // Verify tables were created
  console.log('🔍 Verifying tables...\n');
  
  await verifyMigration('ai_prompts');
  await verifyMigration('trending_cache');
  await verifyMigration('entity_relations');
  await verifyMigration('citations');
  
  console.log('\n━'.repeat(80));
  
  if (successCount === MIGRATIONS.length) {
    console.log('\n🎉 ALL MIGRATIONS APPLIED SUCCESSFULLY!\n');
    console.log('Next steps:');
    console.log('  • Run: npm run ai:learn (test Learning Agent)');
    console.log('  • Run: npm run ai:detect-trends (test Trending Detection)');
    console.log('  • Run: npm run ai:extract-entities (test Entity Extraction)\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME MIGRATIONS FAILED');
    console.log('Check the error messages above and try applying manually.\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
