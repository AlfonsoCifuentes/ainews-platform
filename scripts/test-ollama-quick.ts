#!/usr/bin/env tsx
/**
 * Quick test to verify Ollama is working with classification
 */

import { createLLMClientWithFallback } from '../lib/ai/llm-client';
import { z } from 'zod';

const TestSchema = z.object({
  relevant: z.boolean(),
  category: z.enum(['ai', 'tech', 'other']),
  score: z.number().min(0).max(10)
});

async function main() {
  console.log('🧪 Testing Ollama LLM Client...\n');
  
  const llm = await createLLMClientWithFallback();
  console.log('✓ LLM Client initialized\n');
  
  // Test 1: Simple generation
  console.log('Test 1: Simple generation');
  const response1 = await llm.generate('Say "Hello from Ollama" and nothing else', {
    temperature: 0.1,
    maxTokens: 50
  });
  console.log('Response:', response1.content);
  console.log('Model:', response1.model);
  console.log('✓ Test 1 passed\n');
  
  // Test 2: Classification with JSON schema
  console.log('Test 2: Classification with JSON schema');
  const prompt = `Title: OpenAI Releases GPT-5 with Enhanced Reasoning
Content: OpenAI today announced GPT-5, featuring breakthrough advances in reasoning and multi-modal understanding...

Is this article relevant to AI/ML? Return ONLY valid JSON matching this schema:
{
  "relevant": boolean,
  "category": "ai" | "tech" | "other",
  "score": number (0-10)
}`;

  try {
    const classification = await llm.classify(prompt, TestSchema);
    console.log('Classification result:', classification);
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('✗ Test 2 failed:', error);
    process.exit(1);
  }
  
  console.log('✅ All tests passed!');
}

main().catch(console.error);
