#!/usr/bin/env node

/**
 * 🗄️ MIGRATION HELPER
 * 
 * Este script muestra las migraciones SQL para copiar/pegar en Supabase SQL Editor
 * 
 * Uso: node scripts/show-migrations.js
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const MIGRATIONS_TO_APPLY = [
  '20250107000001_learning_agent.sql',
  '20250107000002_trending_cache.sql',
  '20250107000003_entity_relations.sql',
];

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║       🗄️  MIGRACIONES DE BASE DE DATOS - SUPABASE            ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('📋 INSTRUCCIONES:\n');
console.log('1. Ve a: https://supabase.com/dashboard/project/_/sql/new');
console.log('2. Copia y pega cada migración en el SQL Editor');
console.log('3. Ejecuta cada una (botón "Run")');
console.log('4. Verifica que no haya errores\n');

console.log('═'.repeat(70) + '\n');

MIGRATIONS_TO_APPLY.forEach((migration, index) => {
  const migrationPath = path.join(MIGRATIONS_DIR, migration);
  
  console.log(`\n${'▓'.repeat(70)}`);
  console.log(`▓  MIGRACIÓN ${index + 1}/${MIGRATIONS_TO_APPLY.length}: ${migration}`);
  console.log('▓'.repeat(70) + '\n');
  
  try {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    console.log(sql);
    console.log('\n' + '─'.repeat(70));
    console.log(`✅ Listo para copiar (${sql.length} caracteres)\n`);
  } catch (error) {
    console.error(`❌ Error leyendo ${migration}:`, error.message);
  }
});

console.log('\n' + '═'.repeat(70));
console.log('\n🎯 SIGUIENTE PASO:\n');
console.log('   Copia cada bloque SQL y pégalo en el SQL Editor de Supabase');
console.log('   URL directa: https://supabase.com/dashboard/project/_/sql/new\n');
console.log('═'.repeat(70) + '\n');
