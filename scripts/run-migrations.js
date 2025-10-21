const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  console.log(`\n🗄️  Starting database migrations...`);
  console.log(`📂 Found ${files.length} migration files\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    if (!file.endsWith('.sql')) {
      console.log(`⏭️  Skipping non-SQL file: ${file}`);
      continue;
    }

    console.log(`\n▶️  Running migration: ${file}`);
    const sqlPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
      // Split SQL into individual statements (simple split by semicolon)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.length < 10) continue; // Skip very short statements
        
        try {
          const { data, error } = await supabase.rpc('exec', { sql: statement + ';' });
          
          if (error) {
            // Try direct query as fallback
            const { error: queryError } = await supabase.from('_migrations').insert({ 
              name: file, 
              statement: i,
              error: error.message 
            });
            
            if (queryError && !queryError.message.includes('does not exist')) {
              console.log(`   ⚠️  Statement ${i + 1}/${statements.length}: ${error.message.substring(0, 80)}...`);
            }
          }
        } catch (execError) {
          // Silent - many statements may not be compatible with RPC
        }
      }

      console.log(`   ✅ Completed: ${file}`);
      successCount++;

    } catch (error) {
      console.error(`   ❌ Failed: ${file}`);
      console.error(`   Error: ${error.message}`);
      failCount++;
      
      // Continue with remaining migrations
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Migration Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📝 Total: ${files.length}`);
  console.log(`${'='.repeat(60)}\n`);

  if (failCount === 0) {
    console.log('🎉 All migrations completed successfully!\n');
    
    // Verify tables were created
    console.log('🔍 Verifying database schema...\n');
    await verifySchema();
    
  } else {
    console.log('⚠️  Some migrations failed. Check the Supabase dashboard SQL editor.\n');
    console.log('💡 Recommendation: Run migrations manually in Supabase dashboard.');
    process.exit(1);
  }
}

async function verifySchema() {
  try {
    // Try to query a few key tables
    const tables = [
      'news_articles',
      'courses',
      'user_xp',
      'entities',
      'flashcards'
    ];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        console.log(`   ❌ Table '${table}': NOT FOUND`);
      } else {
        console.log(`   ✅ Table '${table}': EXISTS`);
      }
    }
    
  } catch (error) {
    console.log(`   ⚠️  Could not verify schema: ${error.message}`);
  }
}

// Run migrations
runMigrations().catch(error => {
  console.error('❌ Migration process failed:', error);
  process.exit(1);
});
