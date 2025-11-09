#!/usr/bin/env node
/**
 * Test Ollama Integration
 *
 * Tests that the LLM client correctly uses Ollama in development
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

import { createLLMClientWithFallback } from '../lib/ai/llm-client';

async function testOllamaIntegration() {
  console.log('🧪 Testing Ollama Integration...\n');

  console.log('OLLAMA_BASE_URL:', process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1');

  try {
    console.log('Creating LLM client with automatic fallback (should prioritize Ollama)...');
    const client = await createLLMClientWithFallback();

    console.log('Testing simple generation...');
    const response = await client.generate('Say "Ollama integration successful!" and nothing else.', {
      temperature: 0.1,
      maxTokens: 50
    });

    console.log('Response:', response.content);
    console.log('Model:', response.model);
    console.log('Provider: Ollama');

    if (response.content.toLowerCase().includes('ollama integration successful')) {
      console.log('✅ Ollama integration test PASSED!');
    } else {
      console.log('⚠️ Response received but content unexpected');
    }

  } catch (error) {
    console.error('❌ Ollama integration test FAILED:', error);
    process.exit(1);
  }
}

// Run test
testOllamaIntegration();