#!/usr/bin/env node
/**
 * Ollama Setup Script
 *
 * Installs Ollama and downloads recommended models for development
 */

import { execSync } from 'child_process';

// Check if running on Windows
const isWindows = process.platform === 'win32';

console.log('🤖 Setting up Ollama for local LLM development...\n');

// Check if Ollama is already installed
async function checkOllamaInstalled() {
  try {
    execSync('ollama --version', { stdio: 'pipe' });
    console.log('✅ Ollama is already installed');
    return true;
  } catch {
    console.log('❌ Ollama not found');
    return false;
  }
}

// Install Ollama
async function installOllama() {
  console.log('📦 Installing Ollama...');

  if (isWindows) {
    console.log('🔗 Download Ollama from: https://ollama.ai/download');
    console.log('📋 Run the installer and restart your terminal');
    console.log('⏳ Waiting for installation... (press Enter when done)');
    process.stdin.resume();
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve(void 0));
    });
  } else {
    // For Linux/Mac
    try {
      if (process.platform === 'linux') {
        console.log('🐧 Installing on Linux...');
        execSync('curl -fsSL https://ollama.ai/install.sh | sh', { stdio: 'inherit' });
      } else if (process.platform === 'darwin') {
        console.log('🍎 Installing on macOS...');
        execSync('brew install ollama', { stdio: 'inherit' });
      }
    } catch (_error) {
      console.error('❌ Failed to install Ollama automatically');
      console.log('🔗 Please install manually from: https://ollama.ai/download');
      process.exit(1);
    }
  }
}

// Start Ollama service
async function startOllama() {
  console.log('🚀 Starting Ollama service...');

  try {
    if (isWindows) {
      // On Windows, try to start Ollama service
      try {
        execSync('net start Ollama', { stdio: 'pipe' });
      } catch {
        console.log('💡 Try starting Ollama manually or restart your terminal');
      }
    } else {
      // On Linux/Mac, start in background using nohup
      execSync('nohup ollama serve > /dev/null 2>&1 &', { stdio: 'inherit' });
      // Wait a moment for service to start
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  } catch {
    console.warn('⚠️ Could not start Ollama service automatically');
  }
}

// Download recommended models
async function downloadModels() {
  const models = [
    {
      name: 'llama3.2:3b',
      description: 'Fast, lightweight model for development (3.2B parameters)',
      size: '~2GB',
      useCase: 'General development, testing, fast iteration'
    },
    {
      name: 'qwen2.5:7b',
      description: 'High-quality multilingual model (7B parameters)',
      size: '~4GB',
      useCase: 'Better quality for complex tasks'
    },
    {
      name: 'mistral:7b',
      description: 'Excellent instruction-following (7B parameters)',
      size: '~4GB',
      useCase: 'JSON generation, structured output'
    }
  ];

  console.log('\n📥 Downloading recommended models...\n');

  for (const model of models) {
    console.log(`🔄 Downloading ${model.name} (${model.size})`);
    console.log(`   ${model.description}`);
    console.log(`   Use case: ${model.useCase}\n`);

    try {
      execSync(`ollama pull ${model.name}`, { stdio: 'inherit' });
      console.log(`✅ ${model.name} downloaded successfully\n`);
    } catch (_error) {
      console.error(`❌ Failed to download ${model.name}:`, _error);
    }
  }
}

// Test Ollama
async function testOllama() {
  console.log('🧪 Testing Ollama setup...');

  try {
    const result = execSync('ollama list', { encoding: 'utf8' });
    console.log('📋 Available models:');
    console.log(result);

    // Test a simple generation
    console.log('🤖 Testing model generation...');
    const testResult = execSync('ollama run llama3.2:3b "Hello, respond with just: Ollama is working!" --format json', {
      encoding: 'utf8',
      timeout: 30000
    });

    console.log('✅ Ollama test successful!');
    console.log('📝 Test response:', testResult);

  } catch (_error) {
    console.error('❌ Ollama test failed:', _error);
  }
}

// Main setup function
async function main() {
  try {
    const installed = await checkOllamaInstalled();

    if (!installed) {
      await installOllama();
    }

    await startOllama();
    await downloadModels();
    await testOllama();

    console.log('\n🎉 Ollama setup complete!');
    console.log('\n📚 Available models:');
    console.log('   • llama3.2:3b - Fast development model (recommended for testing)');
    console.log('   • qwen2.5:7b - High-quality multilingual');
    console.log('   • mistral:7b - Excellent for structured output');
    console.log('\n🚀 You can now use Ollama in development!');
    console.log('💡 Run scripts with: npm run ai:curate (will use Ollama automatically)');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
main();