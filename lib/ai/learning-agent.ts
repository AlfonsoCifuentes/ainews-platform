/**
 * 🧠 LEARNING AGENT - AUTO-MEJORANTE
 * 
 * Sistema que analiza feedback de usuarios y mejora continuamente:
 * - Analiza ratings y comentarios
 * - Detecta patrones de baja calidad
 * - Optimiza prompts automáticamente
 * - Log todas las mejoras
 * 
 * Ejecutado diariamente via GitHub Actions
 */

import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { createLLMClientWithFallback, LLMClient } from '@/lib/ai/llm-client';

// ============================================
// TYPES
// ============================================

export interface FeedbackAnalysis {
  averageRating: number;
  totalFeedback: number;
  negativeCount: number;
  positiveCount: number;
  commonIssues: string[];
  improvementSuggestions: string[];
}

export interface PromptImprovement {
  category: string; // 'news_curation', 'course_generation', 'translation'
  oldPrompt: string;
  newPrompt: string;
  reason: string;
  expectedImpact: string;
  timestamp: Date;
}

export interface LearningMetrics {
  totalImprovements: number;
  avgRatingBefore: number;
  avgRatingAfter: number;
  feedbackProcessed: number;
  lastRun: Date;
}

// ============================================
// LEARNING AGENT CLASS
// ============================================

export class LearningAgent {
  private db = getSupabaseServerClient();
  private llm: LLMClient | null = null;

  constructor() {
    // LLM client will be initialized lazily in runLearningCycle()
  }

  /**
   * Ejecuta ciclo completo de aprendizaje
   */
  async runLearningCycle(): Promise<LearningMetrics> {
    console.log('🧠 Learning Agent: Iniciando ciclo de aprendizaje...');

    // Initialize LLM client with multi-provider cloud fallback
    if (!this.llm) {
      this.llm = await createLLMClientWithFallback();
    }

    const startTime = Date.now();
    let improvementsMade = 0;

    try {
      // 1. Analizar feedback reciente (últimas 24h)
      const feedbackAnalysis = await this.analyzeFeedback();
      console.log(`📊 Feedback analizado: ${feedbackAnalysis.totalFeedback} items`);

      // 2. Identificar problemas y generar mejoras
      if (feedbackAnalysis.negativeCount > 0) {
        const improvements = await this.generateImprovements(feedbackAnalysis);
        console.log(`💡 Mejoras generadas: ${improvements.length}`);

        // 3. Aplicar mejoras a los prompts
        for (const improvement of improvements) {
          await this.applyImprovement(improvement);
          improvementsMade++;
        }
      }

      // 4. Marcar feedback como procesado
      await this.markFeedbackProcessed();

      // 5. Calcular métricas
      const metrics = await this.calculateMetrics(improvementsMade);

      // 6. Log del ciclo completo
      await this.logLearningCycle(metrics, Date.now() - startTime);

      console.log('✅ Learning Agent: Ciclo completado exitosamente');
      return metrics;

    } catch (error) {
      console.error('❌ Learning Agent error:', error);
      await this.logError(error as Error);
      throw error;
    }
  }

  /**
   * Analiza feedback reciente y extrae insights
   */
  private async analyzeFeedback(): Promise<FeedbackAnalysis> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // Últimas 24h

    const { data: feedback } = await this.db
      .from('ai_feedback')
      .select('*')
      .gte('created_at', cutoff.toISOString())
      .eq('processed', false)
      .order('created_at', { ascending: false });

    if (!feedback || feedback.length === 0) {
      return {
        averageRating: 0,
        totalFeedback: 0,
        negativeCount: 0,
        positiveCount: 0,
        commonIssues: [],
        improvementSuggestions: [],
      };
    }

    const ratings = feedback.filter(f => f.rating).map(f => f.rating);
    const averageRating = ratings.length > 0 
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
      : 0;

    const negativeCount = feedback.filter(f => f.rating && f.rating <= 2).length;
    const positiveCount = feedback.filter(f => f.rating && f.rating >= 4).length;

    // Extraer problemas comunes usando LLM
    const negativeFeedback = feedback
      .filter(f => f.rating && f.rating <= 2 && f.feedback_text)
      .map(f => f.feedback_text)
      .join('\n---\n');

    let commonIssues: string[] = [];
    let improvementSuggestions: string[] = [];

    if (negativeFeedback) {
      const analysisPrompt = `Analiza el siguiente feedback negativo de usuarios y extrae:
1. Los 5 problemas más comunes (lista concisa)
2. Las 5 mejoras más importantes a implementar (lista concisa)

Feedback:
${negativeFeedback}

Responde en formato JSON:
{
  "commonIssues": ["problema1", "problema2", ...],
  "improvementSuggestions": ["mejora1", "mejora2", ...]
}`;

      try {
        const schema = z.object({
          commonIssues: z.array(z.string()),
          improvementSuggestions: z.array(z.string()),
        });

        const response = await this.llm!.classify(analysisPrompt, schema);

        commonIssues = response.commonIssues || [];
        improvementSuggestions = response.improvementSuggestions || [];
      } catch (error) {
        console.warn('No se pudo analizar feedback con LLM:', error);
      }
    }

    return {
      averageRating,
      totalFeedback: feedback.length,
      negativeCount,
      positiveCount,
      commonIssues,
      improvementSuggestions,
    };
  }

  /**
   * Genera mejoras de prompts basadas en el análisis
   */
  private async generateImprovements(
    analysis: FeedbackAnalysis
  ): Promise<PromptImprovement[]> {
    if (analysis.commonIssues.length === 0) {
      return [];
    }

    // Obtener prompts actuales
    const { data: currentPrompts } = await this.db
      .from('ai_prompts')
      .select('*')
      .eq('active', true);

    if (!currentPrompts || currentPrompts.length === 0) {
      console.warn('No hay prompts activos para mejorar');
      return [];
    }

    const improvements: PromptImprovement[] = [];

    for (const promptRecord of currentPrompts) {
      const category = promptRecord.category;
      const oldPrompt = promptRecord.prompt_text;

      // Generar versión mejorada con LLM
      const improvementPrompt = `Eres un experto en prompt engineering. 

Tienes este prompt actual para ${category}:
"""
${oldPrompt}
"""

Los usuarios han reportado estos problemas:
${analysis.commonIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

Mejoras sugeridas:
${analysis.improvementSuggestions.map((sug, i) => `${i + 1}. ${sug}`).join('\n')}

Genera una versión mejorada del prompt que resuelva estos problemas.

Responde en JSON:
{
  "improvedPrompt": "versión mejorada del prompt",
  "reason": "explicación breve de los cambios hechos",
  "expectedImpact": "mejora esperada en resultados"
}`;

      try {
        const schema = z.object({
          improvedPrompt: z.string(),
          reason: z.string(),
          expectedImpact: z.string(),
        });

        const response = await this.llm!.classify(improvementPrompt, schema);

        // Solo aplicar si hay cambios significativos
        if (response.improvedPrompt !== oldPrompt) {
          improvements.push({
            category,
            oldPrompt,
            newPrompt: response.improvedPrompt,
            reason: response.reason,
            expectedImpact: response.expectedImpact,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.warn(`No se pudo mejorar prompt para ${category}:`, error);
      }
    }

    return improvements;
  }

  /**
   * Aplica una mejora al sistema
   */
  private async applyImprovement(improvement: PromptImprovement): Promise<void> {
    // 1. Desactivar prompt anterior
    await this.db
      .from('ai_prompts')
      .update({ active: false, replaced_at: new Date().toISOString() })
      .eq('category', improvement.category)
      .eq('active', true);

    // 2. Insertar nuevo prompt
    await this.db
      .from('ai_prompts')
      .insert({
        category: improvement.category,
        prompt_text: improvement.newPrompt,
        version: await this.getNextVersion(improvement.category),
        active: true,
        improvement_reason: improvement.reason,
        expected_impact: improvement.expectedImpact,
        created_at: new Date().toISOString(),
      });

    console.log(`✨ Prompt mejorado: ${improvement.category}`);
  }

  /**
   * Obtiene el siguiente número de versión
   */
  private async getNextVersion(category: string): Promise<number> {
    const { data } = await this.db
      .from('ai_prompts')
      .select('version')
      .eq('category', category)
      .order('version', { ascending: false })
      .limit(1);

    return data && data.length > 0 ? data[0].version + 1 : 1;
  }

  /**
   * Marca feedback como procesado
   */
  private async markFeedbackProcessed(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await this.db
      .from('ai_feedback')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .gte('created_at', cutoff.toISOString())
      .eq('processed', false);
  }

  /**
   * Calcula métricas del ciclo
   */
  private async calculateMetrics(improvementsMade: number): Promise<LearningMetrics> {
    // Rating promedio antes (últimos 7 días)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { data: recentFeedback } = await this.db
      .from('ai_feedback')
      .select('rating')
      .gte('created_at', weekAgo.toISOString())
      .not('rating', 'is', null);

    const avgRatingBefore = recentFeedback && recentFeedback.length > 0
      ? recentFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / recentFeedback.length
      : 0;

    // Rating promedio después (mismo cálculo, se actualizará en próximo ciclo)
    const avgRatingAfter = avgRatingBefore; // Placeholder

    // Feedback procesado en últimas 24h
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { count } = await this.db
      .from('ai_feedback')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dayAgo.toISOString());

    return {
      totalImprovements: improvementsMade,
      avgRatingBefore,
      avgRatingAfter,
      feedbackProcessed: count || 0,
      lastRun: new Date(),
    };
  }

  /**
   * Registra el ciclo completo en logs
   */
  private async logLearningCycle(metrics: LearningMetrics, duration: number): Promise<void> {
    await this.db
      .from('ai_system_logs')
      .insert({
        action_type: 'learning_cycle',
        model_used: 'learning-agent',
        success: true,
        execution_time: duration,
        metadata: {
          improvements: metrics.totalImprovements,
          feedback_processed: metrics.feedbackProcessed,
          avg_rating: metrics.avgRatingBefore,
          timestamp: new Date().toISOString(),
        },
      });
  }

  /**
   * Registra errores
   */
  private async logError(error: Error): Promise<void> {
    await this.db
      .from('ai_system_logs')
      .insert({
        action_type: 'learning_cycle',
        model_used: 'learning-agent',
        success: false,
        error_message: error.message,
        execution_time: 0,
        metadata: {
          error_stack: error.stack,
          timestamp: new Date().toISOString(),
        },
      });
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Ejecuta el learning agent (llamado desde GitHub Actions o CLI)
 */
export async function runLearningAgent(): Promise<LearningMetrics> {
  const agent = new LearningAgent();
  return await agent.runLearningCycle();
}

/**
 * Obtiene métricas históricas del learning agent
 */
export async function getLearningMetrics(days = 30): Promise<unknown[]> {
  const db = getSupabaseServerClient();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const { data } = await db
    .from('ai_system_logs')
    .select('*')
    .eq('action_type', 'learning_cycle')
    .gte('timestamp', cutoff.toISOString())
    .order('timestamp', { ascending: false });

  return data || [];
}

/**
 * Obtiene historial de mejoras de prompts
 */
export async function getPromptHistory(category?: string): Promise<unknown[]> {
  const db = getSupabaseServerClient();
  
  let query = db
    .from('ai_prompts')
    .select('*')
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data } = await query;
  return data || [];
}
