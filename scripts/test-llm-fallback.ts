/**
 * Test script for multi-provider LLM system
 * Tests Gemini, OpenRouter, and Groq with automatic fallback
 * 
 * Usage:
 * pnpm tsx scripts/test-llm-fallback.ts
 */

import { config } from 'dotenv';
import path from 'path';
import { createLLMClient, createLLMClientWithFallback, getAvailableProviders, type LLMProvider } from '../lib/ai/llm-client';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

async function testProvider(provider: LLMProvider) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${provider.toUpperCase()} provider`);
  console.log('='.repeat(60));

  try {
    const llm = createLLMClient(provider);
    console.log(`✓ Client created successfully`);

    const prompt = 'Generate a JSON object with a single field "greeting" containing a friendly hello message in 10 words or less.';
    
    console.log(`\nSending test prompt...`);
    const response = await llm.generate(prompt, {
      temperature: 0.7,
      maxTokens: 100
    });

    console.log(`✓ Response received:`);
    console.log(`  - Content length: ${response.content.length} characters`);
    console.log(`  - Usage: ${response.usage.totalTokens} tokens`);
    console.log(`  - Model: ${response.model}`);
    console.log(`\nResponse content:`);
    console.log(response.content);

    // Try parsing as JSON
    try {
      const parsed = JSON.parse(response.content);
      console.log(`\n✓ Valid JSON response`);
      console.log(`  Parsed object:`, parsed);
    } catch {
      console.log(`\n⚠ Response is not valid JSON`);
    }

    return true;
  } catch (error) {
    console.error(`✗ Error testing ${provider}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function testFallbackSystem() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing AUTOMATIC FALLBACK system`);
  console.log('='.repeat(60));

  try {
    const availableProviders = getAvailableProviders();
    console.log(`\nAvailable providers: ${availableProviders.join(', ')}`);

    const llm = await createLLMClientWithFallback();
    console.log(`✓ Fallback client created successfully`);

    const prompt = 'List 3 AI frameworks in JSON format: {"frameworks": ["name1", "name2", "name3"]}';
    
    console.log(`\nSending test prompt...`);
    const response = await llm.generate(prompt, {
      temperature: 0.5,
      maxTokens: 150
    });

    console.log(`✓ Response received:`);
    console.log(`  - Content length: ${response.content.length} characters`);
    console.log(`  - Usage: ${response.usage.totalTokens} tokens`);
    console.log(`  - Model: ${response.model}`);
    console.log(`\nResponse content:`);
    console.log(response.content);

    return true;
  } catch (error) {
    console.error(`✗ Error testing fallback:`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function testClassificationWithStructuredOutput() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing CLASSIFICATION with structured output`);
  console.log('='.repeat(60));

  try {
    const llm = await createLLMClientWithFallback();
    
    const text = 'This article discusses the latest advances in artificial intelligence and machine learning algorithms.';
    const categories = ['Technology', 'Sports', 'Politics', 'Entertainment', 'Science'];
    
    console.log(`\nClassifying text into categories: ${categories.join(', ')}`);
    const response = await llm.generate(
      `Classify the following text into ONE of these categories: ${categories.join(', ')}.
Text: "${text}"

Respond with ONLY a JSON object in this format:
{"category": "the selected category"}`,
      {
        temperature: 0.3,
        maxTokens: 100
      }
    );

    console.log(`\nResponse:`);
    console.log(response.content);

    const parsed = JSON.parse(response.content);
    console.log(`\n✓ Classified as: ${parsed.category}`);

    return true;
  } catch (error) {
    console.error(`✗ Error testing classification:`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║       Multi-Provider LLM System Test Suite              ║
╚══════════════════════════════════════════════════════════╝
`);

  // Check which providers are available
  const providers = getAvailableProviders();
  console.log(`Configured providers: ${providers.length > 0 ? providers.join(', ') : 'NONE'}`);
  
  if (providers.length === 0) {
    console.error(`\n❌ No LLM providers configured!`);
    console.log(`\nPlease set at least one of these environment variables:`);
    console.log(`  - GEMINI_API_KEY (recommended - free tier available)`);
    console.log(`  - OPENROUTER_API_KEY (alternative - free tier available)`);
    console.log(`  - GROQ_API_KEY (alternative - free tier available)`);
    process.exit(1);
  }

  const results: Record<string, boolean> = {};

  // Test each configured provider individually
  for (const provider of providers) {
    results[`${provider}-individual`] = await testProvider(provider as LLMProvider);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit delay
  }

  // Test fallback system
  results['fallback'] = await testFallbackSystem();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test classification
  results['classification'] = await testClassificationWithStructuredOutput();

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST SUMMARY`);
  console.log('='.repeat(60));
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  for (const [test, result] of Object.entries(results)) {
    console.log(`${result ? '✓' : '✗'} ${test}: ${result ? 'PASSED' : 'FAILED'}`);
  }
  
  console.log(`\nTotal: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log(`\n🎉 All tests passed! Multi-provider LLM system is working correctly.`);
    process.exit(0);
  } else {
    console.log(`\n⚠ Some tests failed. Check the logs above for details.`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
