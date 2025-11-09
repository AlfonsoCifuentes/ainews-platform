#!/usr/bin/env node
/**
 * Research: Small LLM Models for Vercel Deployment
 *
 * Investigates which LLM models are small enough to deploy on Vercel
 * Vercel limits: ~1008 MB memory, 10 second cold start, 5 minute execution
 */

import { execSync } from 'child_process';

interface ModelInfo {
  name: string;
  size: string;
  sizeMB: number;
  parameters: string;
  context: string;
  provider: string;
  vercelCompatible: boolean;
  notes: string;
}

// Known small models that might work on Vercel
const potentialModels: ModelInfo[] = [
  // Ollama models (for reference)
  {
    name: 'llama3.2:1b',
    size: '~1.3GB',
    sizeMB: 1300,
    parameters: '1B',
    context: '131K',
    provider: 'Ollama',
    vercelCompatible: false,
    notes: 'Too large for Vercel free tier'
  },
  {
    name: 'llama3.2:3b',
    size: '~2GB',
    sizeMB: 2000,
    parameters: '3B',
    context: '131K',
    provider: 'Ollama',
    vercelCompatible: false,
    notes: 'Too large for Vercel free tier'
  },
  {
    name: 'phi3:3.8b',
    size: '~2.3GB',
    sizeMB: 2300,
    parameters: '3.8B',
    context: '128K',
    provider: 'Ollama',
    vercelCompatible: false,
    notes: 'Too large for Vercel free tier'
  },
  {
    name: 'gemma2:2b',
    size: '~1.6GB',
    sizeMB: 1600,
    parameters: '2B',
    context: '8K',
    provider: 'Ollama',
    vercelCompatible: false,
    notes: 'Too large for Vercel free tier'
  },

  // Web-based solutions (client-side)
  {
    name: '@mlc-ai/web-llm',
    size: '~50-200MB',
    sizeMB: 200,
    parameters: 'Various (1B-7B)',
    context: 'Various',
    provider: 'MLC AI',
    vercelCompatible: true,
    notes: 'Client-side inference, works on Vercel'
  },
  {
    name: 'transformers.js',
    size: '~20-100MB',
    sizeMB: 100,
    parameters: 'Various (distilbert, tinyllama)',
    context: 'Various',
    provider: 'Hugging Face',
    vercelCompatible: true,
    notes: 'Client-side, good for small tasks'
  },

  // API-based solutions (serverless friendly)
  {
    name: 'together.ai tinyllama',
    size: '~500MB',
    sizeMB: 500,
    parameters: '1.1B',
    context: '2K',
    provider: 'Together AI',
    vercelCompatible: true,
    notes: 'API-based, good for Vercel serverless'
  },
  {
    name: 'groq llama-3.2-1b',
    size: '~600MB',
    sizeMB: 600,
    parameters: '1B',
    context: '128K',
    provider: 'Groq',
    vercelCompatible: true,
    notes: 'Fast inference, API-based'
  },

  // Specialized small models
  {
    name: 'distilbert-base-uncased',
    size: '~268MB',
    sizeMB: 268,
    parameters: '66M',
    context: '512',
    provider: 'Hugging Face',
    vercelCompatible: true,
    notes: 'Classification only, not text generation'
  },
  {
    name: 'tinyllama-1.1b',
    size: '~600MB',
    sizeMB: 600,
    parameters: '1.1B',
    context: '2K',
    provider: 'Hugging Face',
    vercelCompatible: true,
    notes: 'Very small, limited capabilities'
  }
];

async function analyzeVercelCompatibility() {
  console.log('🔍 Analyzing LLM Models for Vercel Deployment\n');
  console.log('📊 Vercel Limits:');
  console.log('   • Memory: ~1008 MB (free tier)');
  console.log('   • Cold start: 10 seconds');
  console.log('   • Execution: 5 minutes');
  console.log('   • Bundle size: ~50 MB (uncompressed)\n');

  const compatibleModels = potentialModels.filter(model => model.vercelCompatible);
  const ollamaModels = potentialModels.filter(model => model.provider === 'Ollama');

  console.log('✅ Vercel-Compatible Models:');
  compatibleModels.forEach(model => {
    console.log(`   • ${model.name} (${model.size})`);
    console.log(`     ${model.parameters} params, ${model.context} context`);
    console.log(`     ${model.notes}\n`);
  });

  console.log('🐪 Ollama Models (Local Development Only):');
  ollamaModels.forEach(model => {
    console.log(`   • ${model.name} (${model.size}) - ${model.notes}`);
  });

  console.log('\n💡 Recommendations:');
  console.log('   1. For development: Use Ollama locally (fast, free)');
  console.log('   2. For production: Use API providers (Groq, Together AI)');
  console.log('   3. For client-side: Consider @mlc-ai/web-llm');
  console.log('   4. No self-hosted LLM is small enough for Vercel free tier');

  console.log('\n🚀 Best Options:');
  console.log('   • Development: llama3.2:3b via Ollama');
  console.log('   • Production: Groq llama-3.2-1b or Together AI tinyllama');
  console.log('   • Client-side: @mlc-ai/web-llm for power users');

  // Check if @mlc-ai/web-llm is already installed
  try {
    const packageInfo = execSync('npm list @mlc-ai/web-llm', { encoding: 'utf8' });
    if (packageInfo.includes('@mlc-ai/web-llm')) {
      console.log('\n✅ @mlc-ai/web-llm is already installed');
    }
  } catch {
    console.log('\n⚠️ @mlc-ai/web-llm not installed (optional for client-side inference)');
  }
}

// Run analysis
analyzeVercelCompatibility()
  .then(() => {
    console.log('\n✨ Analysis complete!');
  })
  .catch((error) => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });