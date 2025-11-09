/**
 * Test script for Ultralytics Computer Vision integration
 *
 * Usage:
 * pnpm tsx scripts/test-ultralytics.ts
 */

import { config } from 'dotenv';
import path from 'path';
import { ultralyticsVision } from '../lib/services/ultralytics-vision';
import { enhancedImageDescription } from '../lib/services/enhanced-image-description';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

async function testUltralyticsVision() {
  console.log('🧪 Testing Ultralytics Computer Vision Service');
  console.log('='.repeat(60));

  // Check if service is available
  console.log(`Service available: ${ultralyticsVision.isAvailable()}`);

  if (!ultralyticsVision.isAvailable()) {
    console.log('❌ Ultralytics service not available - check ULTRALYTICS_API_KEY');
    return;
  }

  // Test images
  const testImages = [
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800', // AI/Tech related
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800', // Person with laptop
    'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800', // Generic landscape
  ];

  for (const imageUrl of testImages) {
    console.log(`\n🔍 Analyzing: ${imageUrl}`);
    console.log('-'.repeat(40));

    try {
      // Test basic computer vision
      const analysis = await ultralyticsVision.analyzeImage(imageUrl);
      console.log(`✅ Valid: ${analysis.isValid}`);
      console.log(`🎯 Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
      console.log(`👁️ Detected objects: ${analysis.detectedObjects.join(', ')}`);
      console.log(`📊 Analysis: ${analysis.reasoning}`);
      console.log(`📏 Image size: ${analysis.metadata.imageSize.join('x')}`);
      console.log(`⚡ Inference time: ${analysis.metadata.inferenceTime.toFixed(2)}ms`);

      // Test enhanced description
      console.log(`\n🎨 Generating enhanced description...`);
      const description = await enhancedImageDescription.generateDescription(imageUrl);
      console.log(`📝 Full description: ${description.fullDescription}`);
      console.log(`♿ Accessibility alt: ${description.accessibilityAlt}`);

    } catch (error) {
      console.error(`❌ Analysis failed:`, error instanceof Error ? error.message : error);
    }

    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function testBatchAnalysis() {
  console.log('\n🔄 Testing batch analysis...');
  console.log('='.repeat(40));

  const batchImages = [
    'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600', // Robot/AI
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600', // Person
  ];

  try {
    const results = await ultralyticsVision.analyzeImages(batchImages);
    console.log(`✅ Batch analysis completed: ${results.length} images`);

    results.forEach((result, index) => {
      console.log(`Image ${index + 1}: ${result.detectedObjects.slice(0, 3).join(', ')} (${result.isValid ? '✅' : '❌'})`);
    });
  } catch (error) {
    console.error('❌ Batch analysis failed:', error instanceof Error ? error.message : error);
  }
}

// Run tests
async function main() {
  try {
    await testUltralyticsVision();
    await testBatchAnalysis();
    console.log('\n🎉 All tests completed!');
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }
}

main();