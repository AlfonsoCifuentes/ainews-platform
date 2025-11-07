// Script para verificar el estado de la tabla entity_relations
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTable() {
  console.log('🔍 Verificando estructura de entity_relations...\n');
  
  try {
    // Verificar si la tabla existe
    const { data: tables, error: tablesError } = await supabase
      .from('entity_relations')
      .select('*')
      .limit(1);
    
    if (tablesError) {
      console.log('❌ Error al consultar tabla:', tablesError.message);
      console.log('\n📝 La tabla NO existe o tiene problemas de estructura\n');
      return;
    }
    
    console.log('✅ Tabla existe');
    console.log('📊 Datos de ejemplo:', JSON.stringify(tables, null, 2));
    
    // Intentar obtener información de columnas
    const { data: columns, error: colError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'entity_relations'
        ORDER BY ordinal_position;
      `
    });
    
    if (columns) {
      console.log('\n📋 Columnas actuales:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkTable();
