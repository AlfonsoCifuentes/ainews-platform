#!/usr/bin/env tsx

/**
 * Script para exponer Ollama a internet usando Cloudflare Tunnel
 * Esto permite que Vercel acceda a tu Ollama local
 */

import { spawn } from 'child_process';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║     🌐 CONFIGURAR OLLAMA PARA VERCEL (Cloudflare Tunnel)     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Verificar si Ollama está corriendo
async function checkOllama(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('1️⃣  Verificando Ollama local...');
  
  const isRunning = await checkOllama();
  
  if (!isRunning) {
    console.error('❌ Ollama no está corriendo en localhost:11434');
    console.log('\n💡 Inicia Ollama primero:');
    console.log('   ollama serve');
    process.exit(1);
  }
  
  console.log('✅ Ollama está corriendo\n');

  console.log('2️⃣  Opciones para exponer Ollama a Vercel:\n');
  console.log('━'.repeat(64));
  
  console.log('\n📌 OPCIÓN A: Cloudflare Tunnel (RECOMENDADO - GRATIS)');
  console.log('─'.repeat(64));
  console.log('1. Instalar cloudflared:');
  console.log('   winget install Cloudflare.cloudflared\n');
  console.log('2. Crear túnel:');
  console.log('   cloudflared tunnel --url http://localhost:11434\n');
  console.log('3. Copiar la URL que aparece (ej: https://xxxx.trycloudflare.com)');
  console.log('4. Añadir a Vercel Environment Variables:');
  console.log('   OLLAMA_BASE_URL=https://xxxx.trycloudflare.com/v1\n');

  console.log('\n📌 OPCIÓN B: Ngrok (GRATIS con límites)');
  console.log('─'.repeat(64));
  console.log('1. Instalar ngrok:');
  console.log('   winget install ngrok.ngrok\n');
  console.log('2. Crear túnel:');
  console.log('   ngrok http 11434\n');
  console.log('3. Copiar la URL HTTPS (ej: https://xxxx.ngrok.io)');
  console.log('4. Añadir a Vercel Environment Variables:');
  console.log('   OLLAMA_BASE_URL=https://xxxx.ngrok.io/v1\n');

  console.log('\n📌 OPCIÓN C: Servidor VPS/Cloud con Ollama (MEJOR PARA PRODUCCIÓN)');
  console.log('─'.repeat(64));
  console.log('1. Deploy Ollama en un VPS (DigitalOcean, Hetzner, etc.)');
  console.log('2. Asegurar con HTTPS + API key');
  console.log('3. Añadir URL a Vercel:');
  console.log('   OLLAMA_BASE_URL=https://your-vps.com/v1\n');

  console.log('\n3️⃣  ¿Quieres iniciar Cloudflare Tunnel ahora? (Recomendado)');
  console.log('─'.repeat(64));
  
  // Preguntar al usuario
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Iniciar túnel? (s/n): ', async (answer) => {
    if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'y') {
      console.log('\n🚀 Iniciando Cloudflare Tunnel...\n');
      console.log('━'.repeat(64));
      console.log('⚠️  IMPORTANTE: Copia la URL HTTPS que aparecerá abajo');
      console.log('━'.repeat(64) + '\n');
      
      // Verificar si cloudflared está instalado
      try {
        const tunnel = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:11434'], {
          stdio: 'inherit'
        });

        tunnel.on('error', (_err) => {
          console.error('\n❌ Error: cloudflared no está instalado');
          console.log('\n💡 Instálalo con:');
          console.log('   winget install Cloudflare.cloudflared\n');
          console.log('O descárgalo de: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/\n');
        });

        // Manejar Ctrl+C
        process.on('SIGINT', () => {
          console.log('\n\n⏸️  Túnel detenido');
          console.log('💡 Para usar en Vercel, añade la URL a Environment Variables');
          tunnel.kill();
          process.exit(0);
        });

      } catch (error) {
        console.error('\n❌ Error al iniciar cloudflared:', error);
        console.log('\n💡 Instala cloudflared primero:');
        console.log('   winget install Cloudflare.cloudflared\n');
      }
    } else {
      console.log('\n✅ OK. Configura manualmente según las opciones de arriba.');
      console.log('\n📝 Recuerda añadir OLLAMA_BASE_URL en Vercel Environment Variables');
      console.log('   https://vercel.com/your-project/settings/environment-variables\n');
      rl.close();
    }
  });
}

main().catch(console.error);
