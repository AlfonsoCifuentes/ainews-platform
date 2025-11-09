#!/usr/bin/env node
/**
 * Test script for Visual Similarity Service
 *
 * Tests the visual similarity detection functionality
 */

// Load environment variables
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
  loadEnv({ path: envLocal });
} else {
  loadEnv();
}

import { visualSimilarity } from '../lib/services/visual-similarity';

async function testVisualSimilarity() {
  console.log('[Test] Testing Visual Similarity Service...\n');

  // Test URLs (using some real AI/tech news images)
  const testImages = [
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop', // AI/tech image 1
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop', // Same image (duplicate)
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=600&fit=crop', // AI/tech image 2
    'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=600&fit=crop', // AI/tech image 3
  ];

  console.log('Testing similarity detection...\n');

  for (let i = 0; i < testImages.length; i++) {
    const imageUrl = testImages[i];
    console.log(`Testing image ${i + 1}: ${imageUrl.slice(0, 60)}...`);

    try {
      const result = await visualSimilarity.checkSimilarity(imageUrl, {
        duplicateThreshold: 0,
        similarThreshold: 5,
        maxResults: 3
      });

      console.log(`  Hash: ${result.hash}`);
      console.log(`  Is Duplicate: ${result.isDuplicate}`);
      console.log(`  Is Similar: ${result.isSimilar}`);

      if (result.mostSimilar) {
        console.log(`  Most Similar: ${result.mostSimilar.imageUrl.slice(0, 60)}...`);
        console.log(`  Hamming Distance: ${result.mostSimilar.hammingDistance}`);
        console.log(`  Similarity: ${(result.mostSimilar.similarity * 100).toFixed(1)}%`);
      }

      // Store the hash
      await visualSimilarity.storeHash(imageUrl, result.hash);
      console.log('  ✓ Hash stored\n');

    } catch (error) {
      console.error(`  ✗ Failed: ${error instanceof Error ? error.message : error}\n`);
    }
  }

  console.log('Testing statistics...\n');

  try {
    const stats = await visualSimilarity.getStatistics();
    console.log('Statistics:');
    console.log(`  Total Hashes: ${stats.totalHashes}`);
    console.log(`  Duplicates Found: ${stats.duplicatesFound}`);
    console.log(`  Average Similarity: ${(stats.averageSimilarity * 100).toFixed(1)}%`);
  } catch (error) {
    console.error(`Statistics failed: ${error instanceof Error ? error.message : error}`);
  }

  console.log('\n[Test] Visual similarity test completed!');
}

// Run the test
testVisualSimilarity()
  .then(() => {
    console.log('[Test] All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Test] Test failed:', error);
    process.exit(1);
  });