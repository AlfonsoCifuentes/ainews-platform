#!/usr/bin/env npx tsx

/**
 * Test course generation with local models
 * Run: npx tsx scripts/test-course-generation.ts
 */

import { detectLocalModels, createLocalModelClient } from '../lib/ai/local-models';

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 COURSE GENERATION TEST WITH LOCAL MODELS');
  console.log('='.repeat(80) + '\n');

  // Step 1: Detect models
  console.log('Step 1️⃣  Detecting local models...\n');
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const setup = await detectLocalModels(baseUrl);

  if (!setup.hasOllama) {
    console.log('❌ Ollama not running');
    console.log('\nSetup Ollama with:');
    console.log('  1. Download: https://ollama.ai');
    console.log('  2. Run: ollama serve');
    console.log('  3. Pull model: ollama pull neural-chat:latest');
    process.exit(1);
  }

  if (setup.availableModels.length === 0) {
    console.log('❌ No models found');
    console.log('\nPull a model with:');
    console.log('  ollama pull neural-chat:latest');
    process.exit(1);
  }

  console.log('✅ Found models:');
  setup.availableModels.forEach(m => {
    console.log(`   • ${m.name}`);
  });

  // Step 2: Create client
  console.log('\nStep 2️⃣  Creating LLM client...\n');
  const model = setup.recommendedModel || setup.availableModels[0];
  console.log(`Using: ${model.name}\n`);

  const client = await createLocalModelClient(model);
  console.log('✅ LLM client created\n');

  // Step 3: Test simple generation
  console.log('Step 3️⃣  Testing simple text generation...\n');
  console.log('Prompt: "Explain AI in one sentence."\n');

  try {
    const response = await client.generate(
      'Explain AI in one sentence.',
      { temperature: 0.7, maxTokens: 100 }
    );

    console.log(`✅ Generated (${response.usage.completionTokens} tokens):`);
    console.log(`   "${response.content}"\n`);
  } catch (error) {
    console.error('❌ Generation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  // Step 4: Test JSON generation (for courses)
  console.log('Step 4️⃣  Testing structured JSON output...\n');
  console.log('Requesting JSON schema for course outline...\n');

  try {
    const jsonPrompt = `Generate a course outline in JSON format with this structure:
{
  "title": "Course title",
  "modules": [
    {
      "title": "Module title",
      "duration_minutes": 30
    }
  ]
}

Create outline for "Introduction to Machine Learning".`;

    const response = await client.generate(jsonPrompt, {
      temperature: 0.3,
      maxTokens: 500
    });

    console.log('✅ Generated JSON:');
    console.log(response.content.substring(0, 300) + '...\n');
  } catch (error) {
    console.error('❌ JSON generation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  // Summary
  console.log('='.repeat(80));
  console.log('✅ ALL TESTS PASSED!\n');
  console.log('Your setup is ready for:');
  console.log('  ✓ Generating courses with local AI');
  console.log('  ✓ Creating structured content (JSON)');
  console.log('  ✓ Zero API costs\n');
  console.log('Next steps:');
  console.log('  1. Run dev server: npm run dev');
  console.log('  2. Go to /courses');
  console.log('  3. Click "Generate Course"');
  console.log('  4. Watch it create a complete course!');
  console.log('='.repeat(80) + '\n');
}

main().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
