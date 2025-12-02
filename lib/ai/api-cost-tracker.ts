/**
 * API COST TRACKER - Tracks API costs across LLM providers
 *
 * This module centralizes pricing so that every script and agent can
 * understand how much was spent per provider, per run, and per UTC day.
 */

import {
  CLAUDE_MODELS,
  DEEPSEEK_MODELS,
  GEMINI_MODELS,
  GROQ_MODELS,
  MISTRAL_MODELS,
  OPENAI_MODELS,
} from './model-versions';

export type ProviderId = 'openai' | 'anthropic' | 'google' | 'groq' | 'mistral' | 'deepseek';

export interface ProviderPricing {
  inputPer1M: number;
  outputPer1M: number;
  imagePer1K?: number;
  imagePer4K?: number;
}

export interface UsageRecord {
  timestamp: string;
  provider: ProviderId;
  model: string;
  inputTokens: number;
  outputTokens: number;
  imageCost: number;
  totalCost: number;
  metadata?: Record<string, unknown>;
}

export interface TrackUsageInput {
  provider: ProviderId;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  images?: Array<{ resolution: '1k' | '4k'; count?: number }>;
  metadata?: Record<string, unknown>;
  costOverride?: number;
}

export interface UsageCostBreakdown {
  inputCost: number;
  outputCost: number;
  imageCost: number;
  totalCost: number;
}

const ZERO_USAGE: UsageCostBreakdown = { inputCost: 0, outputCost: 0, imageCost: 0, totalCost: 0 };

export const PROVIDER_PRICING: Record<ProviderId, Record<string, ProviderPricing>> = {
  openai: {
    [OPENAI_MODELS.GPT_5_PRO]: { inputPer1M: 2.40, outputPer1M: 12.00 },
    [OPENAI_MODELS.GPT_5_1]: { inputPer1M: 1.25, outputPer1M: 10.00 },
    [OPENAI_MODELS.GPT_5_MINI]: { inputPer1M: 0.60, outputPer1M: 2.40 },
    [OPENAI_MODELS.GPT_5_NANO]: { inputPer1M: 0.18, outputPer1M: 0.72 },
    [OPENAI_MODELS.O3]: { inputPer1M: 2.50, outputPer1M: 12.00 },
    [OPENAI_MODELS.O4_MINI]: { inputPer1M: 0.80, outputPer1M: 3.20 },
  },
  anthropic: {
    [CLAUDE_MODELS.CLAUDE_OPUS_4_5]: { inputPer1M: 3.75, outputPer1M: 18.75 },
    [CLAUDE_MODELS.CLAUDE_SONNET_4_5]: { inputPer1M: 3.00, outputPer1M: 15.00 },
    [CLAUDE_MODELS.CLAUDE_HAIKU_4_5]: { inputPer1M: 0.80, outputPer1M: 4.00 },
  },
  google: {
    [GEMINI_MODELS.GEMINI_3_PRO]: { inputPer1M: 0.50, outputPer1M: 1.50 },
    [GEMINI_MODELS.GEMINI_2_5_PRO]: { inputPer1M: 0.30, outputPer1M: 1.20 },
    [GEMINI_MODELS.GEMINI_2_5_FLASH]: { inputPer1M: 0.075, outputPer1M: 0.30 },
    [GEMINI_MODELS.GEMINI_3_PRO_IMAGE]: { inputPer1M: 0, outputPer1M: 0, imagePer1K: 0.134, imagePer4K: 0.240 },
    [GEMINI_MODELS.GEMINI_2_5_FLASH_IMAGE]: { inputPer1M: 0, outputPer1M: 0, imagePer1K: 0.080, imagePer4K: 0.140 },
  },
  groq: {
    [GROQ_MODELS.LLAMA_3_3_70B]: { inputPer1M: 0, outputPer1M: 0 },
    [GROQ_MODELS.LLAMA_3_1_8B]: { inputPer1M: 0, outputPer1M: 0 },
  },
  mistral: {
    [MISTRAL_MODELS.MISTRAL_MEDIUM_3_1]: { inputPer1M: 0.70, outputPer1M: 2.10 },
    [MISTRAL_MODELS.MISTRAL_SMALL_3_2]: { inputPer1M: 0.30, outputPer1M: 1.10 },
    [MISTRAL_MODELS.CODESTRAL]: { inputPer1M: 0.40, outputPer1M: 1.60 },
  },
  deepseek: {
    [DEEPSEEK_MODELS.DEEPSEEK_REASONER]: { inputPer1M: 0.42, outputPer1M: 1.68 },
    [DEEPSEEK_MODELS.DEEPSEEK_CHAT]: { inputPer1M: 0.28, outputPer1M: 0.56 },
  },
};

function calculateImageCost(
  provider: ProviderId,
  model: string,
  images?: Array<{ resolution: '1k' | '4k'; count?: number }>
): number {
  if (!images?.length) return 0;
  const pricing = PROVIDER_PRICING[provider]?.[model];
  if (!pricing) return 0;
  return images.reduce((total, { resolution, count = 1 }) => {
    if (resolution === '4k' && pricing.imagePer4K) {
      return total + pricing.imagePer4K * count;
    }
    if (pricing.imagePer1K) {
      return total + pricing.imagePer1K * count;
    }
    return total;
  }, 0);
}

export function estimateUsageCost(input: TrackUsageInput): UsageCostBreakdown {
  if (input.costOverride !== undefined) {
    return { ...ZERO_USAGE, totalCost: input.costOverride };
  }

  const pricing = PROVIDER_PRICING[input.provider]?.[input.model];
  if (!pricing) {
    return ZERO_USAGE;
  }

  const inputTokens = input.inputTokens ?? 0;
  const outputTokens = input.outputTokens ?? 0;
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  const imageCost = calculateImageCost(input.provider, input.model, input.images);
  const totalCost = inputCost + outputCost + imageCost;

  return { inputCost, outputCost, imageCost, totalCost };
}

function getUtcDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export class CostTracker {
  private sessionTotal = 0;
  private dailyTotals = new Map<ProviderId, number>();
  private usageLog: UsageRecord[] = [];
  private currentDate = getUtcDateStamp();

  track(input: TrackUsageInput): UsageRecord {
    const breakdown = estimateUsageCost(input);
    const timestamp = new Date().toISOString();
    const record: UsageRecord = {
      timestamp,
      provider: input.provider,
      model: input.model,
      inputTokens: input.inputTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
      imageCost: breakdown.imageCost,
      totalCost: breakdown.totalCost,
      metadata: input.metadata,
    };

    this.sessionTotal += breakdown.totalCost;

    if (this.currentDate !== getUtcDateStamp()) {
      this.dailyTotals.clear();
      this.currentDate = getUtcDateStamp();
    }

    const previous = this.dailyTotals.get(input.provider) ?? 0;
    this.dailyTotals.set(input.provider, previous + breakdown.totalCost);
    this.usageLog.push(record);
    return record;
  }

  getSessionCost(): number {
    return Number(this.sessionTotal.toFixed(4));
  }

  getDailyCost(provider?: ProviderId): number {
    if (provider) {
      return Number((this.dailyTotals.get(provider) ?? 0).toFixed(4));
    }
    const total = Array.from(this.dailyTotals.values()).reduce((sum, value) => sum + value, 0);
    return Number(total.toFixed(4));
  }

  resetSession(): void {
    this.sessionTotal = 0;
    this.usageLog = [];
  }

  getUsageLog(): UsageRecord[] {
    return [...this.usageLog];
  }

  summarizeByProvider(): Partial<Record<ProviderId, { calls: number; spend: number }>> {
    return this.usageLog.reduce<Partial<Record<ProviderId, { calls: number; spend: number }>>>((acc, record) => {
      const bucket = acc[record.provider] ?? { calls: 0, spend: 0 };
      bucket.calls += 1;
      bucket.spend += record.totalCost;
      acc[record.provider] = bucket;
      return acc;
    }, {});
  }
}

export function getCostTracker(): CostTracker {
  return new CostTracker();
}
