#!/usr/bin/env node
/**
 * Check database schema and verify which migrations are needed
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  // Check if image_alt_text columns exist
  console.log('📋 Checking news_articles table columns:');
  const { data: columns, error: colError } = await supabase
    .from('news_articles')
    .select('*')
    .limit(1);

  if (colError) {
    console.error('❌ Error querying news_articles:', colError.message);
  } else if (columns && columns.length > 0) {
    const sampleRow = columns[0];
    const hasAltTextEn = 'image_alt_text_en' in sampleRow;
    const hasAltTextEs = 'image_alt_text_es' in sampleRow;
    const hasImageWidth = 'image_width' in sampleRow;
    const hasImageHash = 'image_hash' in sampleRow;

    console.log(`  ✓ news_articles exists`);
    console.log(`  ${hasAltTextEn ? '✅' : '❌'} image_alt_text_en column`);
    console.log(`  ${hasAltTextEs ? '✅' : '❌'} image_alt_text_es column`);
    console.log(`  ${hasImageWidth ? '✅' : '❌'} image_width column`);
    console.log(`  ${hasImageHash ? '✅' : '❌'} image_hash column`);
  }

  // Check if image_visual_hashes table exists
  console.log('\n📋 Checking image_visual_hashes table:');
  const { data: hashTable, error: hashError } = await supabase
    .from('image_visual_hashes')
    .select('*')
    .limit(1);

  if (hashError) {
    if (hashError.message.includes('does not exist') || hashError.code === 'PGRST204' || hashError.code === 'PGRST205') {
      console.log('  ❌ image_visual_hashes table does NOT exist (needs creation)');
    } else {
      console.error('  ❌ Error querying image_visual_hashes:', hashError.message);
    }
  } else {
    console.log('  ✅ image_visual_hashes table exists');
    if (hashTable && hashTable.length > 0) {
      console.log(`  ℹ️  Contains ${hashTable.length} record(s)`);
    }
  }

  // Summary
  console.log('\n📊 MIGRATION REQUIREMENTS:');
  
  const needsImageMetadata = !('image_alt_text_en' in (columns?.[0] || {}));
  const needsVisualHashesTable = hashError?.code === 'PGRST204' || hashError?.code === 'PGRST205';

  if (!needsImageMetadata && !needsVisualHashesTable) {
    console.log('  ✅ All required schema elements are present!');
    console.log('  ℹ️  No migrations needed.');
    return { needsMigration: false };
  }

  if (needsImageMetadata) {
    console.log('  ⚠️  NEEDED: 20251104_add_image_metadata.sql');
  }

  if (needsVisualHashesTable) {
    console.log('  ⚠️  NEEDED: Create image_visual_hashes table');
  }

  return { 
    needsMigration: true, 
    needsImageMetadata,
    needsVisualHashesTable 
  };
}

checkSchema()
  .then(result => {
    if (!result.needsMigration) {
      process.exit(0);
    } else {
      console.log('\n⚠️  Database schema is incomplete. Run migrations to fix.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Schema check failed:', error);
    process.exit(1);
  });
