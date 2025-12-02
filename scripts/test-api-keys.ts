/**
 * Test API Keys - Verifica qué APIs funcionan correctamente
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

console.log('\n🔑 API KEY TEST - Checking all providers\n');
console.log('='.repeat(60));

async function testClaude() {
  console.log('\n📝 Testing ANTHROPIC (Claude)...');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.log('   ❌ ANTHROPIC_API_KEY not set');
    return false;
  }
  
  console.log(`   Key starts with: ${apiKey.slice(0, 20)}...`);
  
  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "Hello, test successful!" in exactly those words.' }],
    });
    
    const text = response.content[0];
    if (text.type === 'text') {
      console.log(`   ✅ CLAUDE WORKS! Response: "${text.text.slice(0, 50)}..."`);
      return true;
    }
    return false;
  } catch (error: any) {
    console.log(`   ❌ CLAUDE FAILED: ${error.message}`);
    if (error.status) console.log(`   Status: ${error.status}`);
    return false;
  }
}

async function testOpenAI() {
  console.log('\n🤖 Testing OPENAI (GPT)...');
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('   ❌ OPENAI_API_KEY not set');
    return false;
  }
  
  console.log(`   Key starts with: ${apiKey.slice(0, 20)}...`);
  
  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cheapest model to test
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "Hello, test successful!" in exactly those words.' }],
    });
    
    console.log(`   ✅ OPENAI WORKS! Response: "${response.choices[0]?.message?.content?.slice(0, 50)}..."`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ OPENAI FAILED: ${error.message}`);
    return false;
  }
}

async function testGroq() {
  console.log('\n⚡ Testing GROQ...');
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.log('   ❌ GROQ_API_KEY not set');
    return false;
  }
  
  console.log(`   Key starts with: ${apiKey.slice(0, 20)}...`);
  
  try {
    const groq = new Groq({ apiKey });
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "Hello, test successful!" in exactly those words.' }],
    });
    
    console.log(`   ✅ GROQ WORKS! Response: "${response.choices[0]?.message?.content?.slice(0, 50)}..."`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ GROQ FAILED: ${error.message}`);
    return false;
  }
}

async function testGemini() {
  console.log('\n🌐 Testing GOOGLE (Gemini)...');
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('   ❌ GEMINI_API_KEY not set');
    return false;
  }
  
  console.log(`   Key starts with: ${apiKey.slice(0, 20)}...`);
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent('Say "Hello, test successful!" in exactly those words.');
    const response = await result.response;
    
    console.log(`   ✅ GEMINI WORKS! Response: "${response.text().slice(0, 50)}..."`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ GEMINI FAILED: ${error.message}`);
    return false;
  }
}

async function testDeepSeek() {
  console.log('\n🧠 Testing DEEPSEEK...');
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.log('   ❌ DEEPSEEK_API_KEY not set');
    return false;
  }
  
  console.log(`   Key starts with: ${apiKey.slice(0, 20)}...`);
  
  try {
    const deepseek = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com/v1',
    });
    
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "Hello, test successful!" in exactly those words.' }],
    });
    
    console.log(`   ✅ DEEPSEEK WORKS! Response: "${response.choices[0]?.message?.content?.slice(0, 50)}..."`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ DEEPSEEK FAILED: ${error.message}`);
    return false;
  }
}

async function testMistral() {
  console.log('\n🌀 Testing MISTRAL...');
  const apiKey = process.env.MISTRAL_API_KEY;
  
  if (!apiKey) {
    console.log('   ❌ MISTRAL_API_KEY not set');
    return false;
  }
  
  console.log(`   Key starts with: ${apiKey.slice(0, 20)}...`);
  
  try {
    const mistral = new OpenAI({
      apiKey,
      baseURL: 'https://api.mistral.ai/v1',
    });
    
    const response = await mistral.chat.completions.create({
      model: 'mistral-small-latest',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "Hello, test successful!" in exactly those words.' }],
    });
    
    console.log(`   ✅ MISTRAL WORKS! Response: "${response.choices[0]?.message?.content?.slice(0, 50)}..."`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ MISTRAL FAILED: ${error.message}`);
    return false;
  }
}

async function main() {
  const results = {
    claude: await testClaude(),
    openai: await testOpenAI(),
    groq: await testGroq(),
    gemini: await testGemini(),
    deepseek: await testDeepSeek(),
    mistral: await testMistral(),
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  const working = Object.entries(results)
    .filter(([_, works]) => works)
    .map(([name]) => name);
  
  const failed = Object.entries(results)
    .filter(([_, works]) => !works)
    .map(([name]) => name);
  
  console.log(`\n✅ Working APIs (${working.length}): ${working.join(', ') || 'NONE'}`);
  console.log(`❌ Failed APIs (${failed.length}): ${failed.join(', ') || 'NONE'}`);
  
  if (working.length === 0) {
    console.log('\n⚠️ NO APIs are working! Check your API keys in .env.local');
  } else {
    console.log(`\n💡 Recommendation: Use ${working[0].toUpperCase()} as primary provider`);
  }
  
  console.log('\n');
}

main().catch(console.error);
