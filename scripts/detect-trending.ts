#!/usr/bin/env tsx

/**
 * 📈 TRENDING TOPICS DETECTOR
 * 
 * Detecta y cachea trending topics cada 6 horas
 */

import 'dotenv/config';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { detectTrendingTopics } from '@/lib/ai/trending';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║            📈 TRENDING TOPICS DETECTION                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();
  const db = getSupabaseServerClient();

  try {
    // Detectar trending topics (últimas 24 horas)
    console.log('🔍 Analizando artículos de las últimas 24 horas...');
    const topics = await detectTrendingTopics(24);

    console.log(`📊 Topics detectados: ${topics.length}`);

    // Guardar/actualizar en cache
    if (topics.length > 0) {
      // Eliminar cache antiguo
      await db.from('trending_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insertar nuevos trending topics
      const { error } = await db.from('trending_cache').insert(
        topics.map((topic) => ({
          topic: topic.topic,
          count: topic.count,
          momentum: topic.momentum,
          article_ids: topic.articles,
          detected_at: new Date().toISOString(),
        }))
      );

      if (error) {
        console.error('❌ Error guardando cache:', error);
        throw error;
      }

      console.log('✅ Cache actualizado exitosamente');

      // Mostrar top 10
      console.log('');
      console.log('🔥 Top 10 Trending Topics:');
      topics.slice(0, 10).forEach((topic, i) => {
        console.log(`   ${i + 1}. ${topic.topic} (${topic.count} mentions, momentum: ${topic.momentum.toFixed(2)})`);
      });
    } else {
      console.log('⚠️  No hay trending topics en este momento');
    }

    // Log en sistema
    await db.from('ai_system_logs').insert({
      action_type: 'trending_detection',
      model_used: 'keyword-momentum',
      success: true,
      execution_time: Date.now() - startTime,
      metadata: {
        topics_found: topics.length,
        timestamp: new Date().toISOString(),
      },
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('');
    console.log(`⏱️  Completado en ${duration}s`);
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error);
    
    // Log error
    await db.from('ai_system_logs').insert({
      action_type: 'trending_detection',
      model_used: 'keyword-momentum',
      success: false,
      error_message: error instanceof Error ? error.message : String(error),
      execution_time: Date.now() - startTime,
    });

    process.exit(1);
  }
}

main();
