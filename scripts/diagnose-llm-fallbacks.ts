/**
 * Script de diagnóstico del sistema de fallbacks LLM
 * Verifica qué providers están disponibles y en qué orden se intentarán
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getAvailableProviders } from '../lib/ai/llm-client';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function diagnose() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║       🔍 DIAGNÓSTICO DEL SISTEMA DE FALLBACKS LLM             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Verificar Ollama
  console.log('1️⃣  OLLAMA (Local Model - ZERO COST)');
  console.log('─'.repeat(60));

  const isVercel = process.env.VERCEL === '1';
  if (isVercel) {
    console.log('   ⚠️  Running on Vercel - Ollama not available');
  } else {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Ollama is RUNNING`);
        console.log(`   📍 URL: ${ollamaUrl}`);
        console.log(`   🤖 Available models:`);
        data.models?.forEach((model: { name: string; size: number }) => {
          const sizeMB = (model.size / 1024 / 1024).toFixed(0);
          console.log(`      • ${model.name} (${sizeMB} MB)`);
        });
      } else {
        console.log(`   ❌ Ollama responded but returned status: ${response.status}`);
      }
    } catch {
      console.log(`   ❌ Ollama is NOT running`);
      console.log(`   💡 Start it with: ollama serve`);
      console.log(`   💡 Or install: winget install Ollama.Ollama`);
    }
  }

console.log('\n2️⃣  CLOUD PROVIDERS (API Keys)');
console.log('─'.repeat(60));

const providers = [
  { name: 'Anthropic Claude', env: 'ANTHROPIC_API_KEY', prefix: 'sk-ant-' },
  { name: 'Groq', env: 'GROQ_API_KEY', prefix: 'gsk_' },
  { name: 'Google Gemini', env: 'GEMINI_API_KEY', prefix: 'AIza' },
  { name: 'DeepSeek', env: 'DEEPSEEK_API_KEY', prefix: 'sk-' },
  { name: 'Mistral AI', env: 'MISTRAL_API_KEY', prefix: '' },
  { name: 'OpenRouter', env: 'OPENROUTER_API_KEY', prefix: 'sk-or-' },
  { name: 'Together AI', env: 'TOGETHER_API_KEY', prefix: '' },
];

let _configuredCount = 0;

providers.forEach(({ name, env, prefix }) => {
  const apiKey = process.env[env];
  if (apiKey) {
    const preview = prefix 
      ? `${prefix}...${apiKey.slice(-4)}`
      : `${apiKey.substring(0, 10)}...${apiKey.slice(-4)}`;
    console.log(`   ✅ ${name.padEnd(20)} ${preview}`);
    _configuredCount++;
  } else {
    console.log(`   ❌ ${name.padEnd(20)} Not configured`);
  }
});

console.log('\n3️⃣  FALLBACK ORDER (Priority)');
console.log('─'.repeat(60));

const availableProviders = getAvailableProviders();

if (availableProviders.length === 0) {
  console.log('   ❌ NO PROVIDERS AVAILABLE!');
  console.log('   ⚠️  Course generation will FAIL');
} else {
  console.log(`   ✅ ${availableProviders.length} provider(s) available:\n`);
  availableProviders.forEach((provider, index) => {
    const isFree = provider === 'ollama';
    const emoji = isFree ? '🏠' : '☁️';
    const cost = isFree ? 'FREE (Local)' : 'API Cost';
    const priority = index === 0 ? '🥇 PRIMARY' : index === 1 ? '🥈 SECONDARY' : '🥉 TERTIARY';
    console.log(`   ${priority} ${emoji} ${provider.toUpperCase().padEnd(12)} - ${cost}`);
  });
}

console.log('\n4️⃣  RECOMMENDATIONS');
console.log('─'.repeat(60));

if (availableProviders.length === 0) {
  console.log('   ⛔ CRITICAL: No LLM providers available!');
  console.log('   📝 Actions required:');
  console.log('      1. Install Ollama: winget install Ollama.Ollama');
  console.log('      2. Or add API keys to .env.local');
} else if (availableProviders.length === 1) {
  console.log('   ⚠️  Only 1 provider available - no fallback redundancy');
  console.log('   💡 Recommendation: Add at least 2 more API keys for reliability');
} else if (availableProviders.length === 2) {
  console.log('   ✅ 2 providers available - basic redundancy');
  console.log('   💡 Recommendation: Add 1 more for better reliability');
} else {
  console.log('   ✅ Excellent! Multiple providers configured');
  console.log('   🎯 System will try providers in order until one succeeds');
}

if (availableProviders[0] === 'ollama') {
  console.log('   🏆 OPTIMAL: Using Ollama as primary = ZERO API costs!');
} else if (availableProviders.includes('ollama')) {
  console.log('   ⚠️  Ollama is available but not primary (check if it\'s running)');
} else {
  console.log('   💡 TIP: Install Ollama for free local LLM (no API costs)');
}

console.log('\n5️⃣  QUICK TEST');
console.log('─'.repeat(60));

if (availableProviders.length > 0) {
  console.log('   📝 To test course generation:');
  console.log('      1. Go to: http://localhost:3000/en/courses');
  console.log('      2. Click "Generate Course"');
  console.log('      3. Topic: "Introduction to Neural Networks"');
  console.log('      4. Check server logs for fallback sequence');
  console.log('\n   📊 Expected log output:');
  console.log('      [LLM Fallback] 🔄 Starting multi-provider fallback...');
  availableProviders.slice(0, 3).forEach((provider) => {
    console.log(`      [LLM Fallback] 🤖 Trying provider: ${provider.toUpperCase()}`);
  });
} else {
  console.log('   ❌ Cannot test - no providers available');
}

console.log('\n' + '═'.repeat(64));
console.log('   💡 For more info, see: COURSE_GENERATION_FIX.md');
console.log('═'.repeat(64) + '\n');
}

// Run the diagnostic
diagnose().catch(console.error);
