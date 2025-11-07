#!/usr/bin/env tsx

/**
 * 🖼️ FIX MISSING IMAGES - ULTRA EDITION
 * 
 * Uses the ultra image scraper to find and fix articles without images
 * 
 * Features:
 * - Playwright real browser automation
 * - AI computer vision validation
 * - Multiple fallback strategies
 * - Batch processing with progress
 * 
 * Usage:
 *   npm run fix-images
 *   npm run fix-images -- --limit 100
 */

import 'dotenv/config';
import { batchFixMissingImages } from '../lib/services/ultra-image-scraper';

async function main() {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 && args[limitIndex + 1] 
    ? parseInt(args[limitIndex + 1], 10) 
    : 50;
  
  if (isNaN(limit) || limit < 1) {
    console.error('❌ Invalid limit value. Must be a positive number.');
    process.exit(1);
  }
  
  console.log('🖼️  ULTRA IMAGE FIXER');
  console.log('='.repeat(80));
  console.log(`📊 Processing limit: ${limit} articles`);
  console.log(`🎭 Using Playwright for real browser automation`);
  console.log(`👁️  AI vision validation enabled`);
  console.log('='.repeat(80));
  console.log('');
  
  const startTime = Date.now();
  
  try {
    await batchFixMissingImages(limit);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n⏱️  Total time: ${duration}s`);
    console.log('✅ Complete!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
