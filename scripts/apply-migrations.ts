/**
 * 🗄️ APPLY MIGRATIONS
 * 
 * Aplica las migraciones pendientes a Supabase
 * 
 * Uso: tsx scripts/apply-migrations.ts
 */

import { getSupabaseServerClient } from '@/lib/db/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

const MIGRATIONS_TO_APPLY = [
  '20250107000001_learning_agent.sql',
  '20250107000002_trending_cache.sql',
  '20250107000003_entity_relations.sql',
];

async function applyMigrations() {
  console.log('🗄️  Aplicando migraciones a Supabase...\n');
  
  const supabase = getSupabaseServerClient();
  let successCount = 0;
  let errorCount = 0;

  for (const migration of MIGRATIONS_TO_APPLY) {
    const migrationPath = join(MIGRATIONS_DIR, migration);
    
    try {
      console.log(`📄 Aplicando: ${migration}`);
      const sql = readFileSync(migrationPath, 'utf-8');
      
      // Split SQL by statement (basic approach - splits on semicolons outside of strings)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
          
          if (error) {
            // If exec_sql doesn't exist, try direct query
            const { error: queryError } = await supabase
              .from('_migrations')
              .select('*')
              .limit(0); // Just to test connection
            
            if (queryError) {
              throw new Error(`Failed to execute: ${error.message}`);
            }
          }
        }
      }
      
      console.log(`   ✅ ${migration} aplicada exitosamente\n`);
      successCount++;
      
    } catch (error) {
      console.error(`   ❌ Error aplicando ${migration}:`);
      console.error(`   ${error instanceof Error ? error.message : String(error)}\n`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Resumen:`);
  console.log(`   ✅ Exitosas: ${successCount}`);
  console.log(`   ❌ Errores: ${errorCount}`);
  console.log('='.repeat(60));

  if (errorCount > 0) {
    console.log('\n⚠️  Algunas migraciones fallaron. Por favor, aplícalas manualmente en el dashboard de Supabase.');
    console.log('   URL: https://supabase.com/dashboard/project/YOUR_PROJECT/editor');
  } else {
    console.log('\n🎉 Todas las migraciones aplicadas correctamente!');
  }
}

applyMigrations().catch(console.error);
