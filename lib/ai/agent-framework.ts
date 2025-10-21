import type { SupabaseClient } from '@supabase/supabase-js';
import type { LLMClient } from './llm-client';

export interface AgentMetrics {
  actionType: string;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  success: boolean;
  errorMessage?: string;
  executionTime: number;
  cost: number;
}

export abstract class AIAgent {
  constructor(
    protected readonly llm: LLMClient,
    protected readonly db: SupabaseClient,
  ) {}

  abstract execute(): Promise<void>;

  protected async logPerformance(metrics: AgentMetrics): Promise<void> {
    try {
      const { error } = await this.db.from('ai_system_logs').insert({
        action_type: metrics.actionType,
        model_used: metrics.modelUsed,
        input_tokens: metrics.inputTokens,
        output_tokens: metrics.outputTokens,
        success: metrics.success,
        error_message: metrics.errorMessage,
        execution_time: metrics.executionTime,
        cost: metrics.cost,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error('[AIAgent] Failed to log performance:', error);
      }
    } catch (err) {
      console.error('[AIAgent] Exception while logging performance:', err);
    }
  }

  protected calculateCost(
    promptTokens: number,
    completionTokens: number,
    model: string,
  ): number {
    // Free tier models have $0 cost
    if (model.includes('free') || model.includes('instant')) {
      return 0;
    }

    // Fallback pricing (adjust based on actual model pricing)
    const promptCostPer1k = 0.0001;
    const completionCostPer1k = 0.0002;

    return (
      (promptTokens / 1000) * promptCostPer1k +
      (completionTokens / 1000) * completionCostPer1k
    );
  }
}
