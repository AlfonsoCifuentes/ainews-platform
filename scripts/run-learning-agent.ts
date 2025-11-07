#!/usr/bin/env tsx

/**
 * 🧠 LEARNING AGENT CLI
 * 
 * Ejecuta el ciclo de aprendizaje del AI Learning Agent
 * 
 * Usage:
 *   npm run ai:learn
 *   tsx scripts/run-learning-agent.ts
 */

import 'dotenv/config';
import { runLearningAgent } from '@/lib/ai/learning-agent';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         🧠 AI LEARNING AGENT - AUTO-MEJORANTE            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();

  try {
    const metrics = await runLearningAgent();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ CICLO COMPLETADO                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`⏱️  Duración: ${duration}s`);
    console.log(`📊 Feedback procesado: ${metrics.feedbackProcessed}`);
    console.log(`✨ Mejoras aplicadas: ${metrics.totalImprovements}`);
    console.log(`⭐ Rating promedio: ${metrics.avgRatingBefore.toFixed(2)}/5.0`);
    console.log('');

    if (metrics.totalImprovements > 0) {
      console.log('🎉 ¡El sistema ha mejorado automáticamente!');
      console.log('   Los prompts han sido optimizados basándose en feedback real.');
    } else {
      console.log('✓  No se requirieron mejoras en este ciclo.');
      console.log('   El sistema está funcionando bien.');
    }

    console.log('');
    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('╔═══════════════════════════════════════════════════════════╗');
    console.error('║                    ❌ ERROR CRÍTICO                       ║');
    console.error('╚═══════════════════════════════════════════════════════════╝');
    console.error('');
    console.error(error);
    console.error('');
    process.exit(1);
  }
}

main();
