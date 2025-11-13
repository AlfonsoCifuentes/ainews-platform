#!/usr/bin/env npx tsx

/**
 * Script to diagnose local AI model setup and availability
 * Run: npx tsx scripts/diagnose-local-models.ts
 */

import { 
  detectLocalModels, 
  checkOllamaAvailability,
  getOllamaModels,
  checkModelAvailability,
  formatModelInfo
} from '../lib/ai/local-models';

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 LOCAL AI MODELS DIAGNOSTIC');
  console.log('='.repeat(80) + '\n');

  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  console.log(`📍 Ollama URL: ${baseUrl}\n`);

  // Step 1: Check Ollama availability
  console.log('Step 1: Checking Ollama availability...');
  const availability = await checkOllamaAvailability(baseUrl);

  if (!availability.isRunning) {
    console.log('❌ Ollama is NOT running');
    console.log(`   Error: ${availability.error}\n`);
    console.log('Setup instructions:');
    console.log('  1. Download: https://ollama.ai');
    console.log('  2. Install and run Ollama');
    console.log('  3. Pull a model: ollama pull neural-chat:latest');
    console.log('  4. Run this script again\n');
    process.exit(1);
  }

  console.log(`✅ Ollama is running (v${availability.version})\n`);

  // Step 2: Get available models
  console.log('Step 2: Fetching available models...');
  const models = await getOllamaModels(baseUrl);

  if (models.length === 0) {
    console.log('⚠️  No models found\n');
    console.log('Available models to pull:');
    console.log('  - neural-chat:latest       (7B, fast, recommended for courses)');
    console.log('  - llama3.2:latest          (lightweight, good starting point)');
    console.log('  - dolphin-mixtral:latest   (advanced, best reasoning)');
    console.log('  - mistral:latest           (general purpose, 7B)');
    console.log('  - openchat:latest          (conversational, lightweight)\n');
    console.log('Pull a model with: ollama pull <model-name>\n');
    process.exit(1);
  }

  console.log(`✅ Found ${models.length} model(s):\n`);
  for (const model of models) {
    console.log(`  📦 ${model.name}`);
    console.log(`     Size: ${model.size.toFixed(1)}GB`);
    console.log(`     Speed: ${model.speedRating || 'unknown'}`);
    if (model.contextLength) {
      console.log(`     Context: ${model.contextLength} tokens`);
    }
    if (model.isBestForJSON) {
      console.log(`     ✨ Good for JSON generation (courses)`);
    }
  }
  console.log();

  // Step 3: Check model responsiveness
  console.log('Step 3: Checking model responsiveness...');
  for (const model of models) {
    const isAvailable = await checkModelAvailability(model);
    const status = isAvailable ? '✅ Online' : '⚠️  Offline/Slow';
    console.log(`  ${status}: ${model.name}`);
  }
  console.log();

  // Step 4: Full setup detection
  console.log('Step 4: Full setup detection...');
  const setup = await detectLocalModels(baseUrl);

  console.log(`✅ Setup Status:`);
  console.log(`   Ollama: ${setup.hasOllama ? '✓ Running' : '✗ Not running'}`);
  console.log(`   Models: ${setup.availableModels.length}`);
  if (setup.recommendedModel) {
    console.log(`   Recommended: ${setup.recommendedModel.name}`);
    console.log(`   Info: ${formatModelInfo(setup.recommendedModel)}`);
  }
  console.log();

  // Step 5: Verify LLM client creation
  console.log('Step 5: Testing LLM client creation...');
  try {
    const { createLLMClient } = await import('../lib/ai/llm-client');
    const _client = createLLMClient('ollama', models[0].name);
    console.log(`✅ LLM client created successfully for: ${models[0].name}`);
    console.log();
  } catch (error) {
    console.log(`❌ Failed to create LLM client:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }

  // Summary
  console.log('='.repeat(80));
  console.log('✅ ALL CHECKS PASSED!\n');
  console.log('Your local AI setup is ready for course generation!');
  console.log('\nNow you can:');
  console.log('  1. Generate courses with zero API costs');
  console.log('  2. Use offline mode - no internet required');
  console.log('  3. Keep all data private - no cloud uploads');
  console.log('\nStart the development server: npm run dev');
  console.log('='.repeat(80) + '\n');
}

main().catch((error) => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
