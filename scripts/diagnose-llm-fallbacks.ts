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

console.log('1️⃣  CLOUD PROVIDERS (API Keys)');
console.log('─'.repeat(60));

const providers = [
  { name: 'Anthropic Claude', env: 'ANTHROPIC_API_KEY' },
  { name: 'Groq', env: 'GROQ_API_KEY' },
  { name: 'Google Gemini', env: 'GEMINI_API_KEY' },
  { name: 'DeepSeek', env: 'DEEPSEEK_API_KEY' },
  { name: 'Mistral AI', env: 'MISTRAL_API_KEY' },
  { name: 'OpenRouter', env: 'OPENROUTER_API_KEY' },
  { name: 'Together AI', env: 'TOGETHER_API_KEY' },
];

let _configuredCount = 0;

providers.forEach(({ name, env }) => {
  const apiKey = process.env[env];
  if (apiKey) {
    console.log(`   ✅ ${name.padEnd(20)} Configured`);
    _configuredCount++;
  } else {
    console.log(`   ❌ ${name.padEnd(20)} Not configured`);
  }
});

console.log('\n2️⃣  FALLBACK ORDER (Priority)');
console.log('─'.repeat(60));

const availableProviders = getAvailableProviders();

if (availableProviders.length === 0) {
  console.log('   ❌ NO PROVIDERS AVAILABLE!');
  console.log('   ⚠️  Course generation will FAIL');
} else {
  console.log(`   ✅ ${availableProviders.length} provider(s) available:\n`);
  availableProviders.forEach((provider, index) => {
    const emoji = '☁️';
    const cost = 'API Cost';
    const priority = index === 0 ? '🥇 PRIMARY' : index === 1 ? '🥈 SECONDARY' : '🥉 TERTIARY';
    console.log(`   ${priority} ${emoji} ${provider.toUpperCase().padEnd(12)} - ${cost}`);
  });
}

console.log('\n3️⃣  RECOMMENDATIONS');
console.log('─'.repeat(60));

if (availableProviders.length === 0) {
  console.log('   ⛔ CRITICAL: No LLM providers available!');
  console.log('   📝 Actions required:');
  console.log('      1. Add API keys to .env.local');
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

console.log('\n4️⃣  QUICK TEST');
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
