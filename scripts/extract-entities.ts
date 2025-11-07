#!/usr/bin/env tsx

/**
 * 🕸️ ENTITY EXTRACTOR
 * 
 * Extrae entidades y relaciones de artículos para construir Knowledge Graph
 */

import 'dotenv/config';
import { runEntityExtractor } from '@/lib/ai/entity-extractor';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║          🕸️ KNOWLEDGE GRAPH - ENTITY EXTRACTOR          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  const limit = parseInt(process.argv[2] || '50', 10);
  console.log(`📰 Processing ${limit} recent articles...`);
  console.log('');

  const startTime = Date.now();

  try {
    await runEntityExtractor(limit);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('');
    console.log('✅ Knowledge Graph updated successfully');
    console.log(`⏱️  Completed in ${duration}s`);
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error);
    process.exit(1);
  }
}

main();
