/**
 * UNIFIED LLM CLIENT - Multi-provider LLM interface with cloud-only cascade
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ZodSchema } from 'zod';

import {
  CLAUDE_MODELS,
  DEEPSEEK_MODELS,
  GEMINI_MODELS,
  GROQ_MODELS,
  MISTRAL_MODELS,
  OPENAI_MODELS,
} from './model-versions';
import { CostTracker, type ProviderId } from './api-cost-tracker';

type SupportedProvider = 'groq' | 'google' | 'mistral' | 'deepseek' | 'openai' | 'anthropic';

export type ProviderCombination = 'groq_gemini_mistral' | 'deepseek_openai_claude';

export interface GenerateOptions<TSchema = unknown> {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  schema?: ZodSchema<TSchema>;
}

export interface GenerateResult<TSchema = unknown> {
  success: boolean;
  text?: string;
  data?: TSchema;
  error?: string;
  provider?: SupportedProvider;
  model?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

interface ProviderTarget {
  provider: SupportedProvider;
  model: string;
}

interface ProviderResponse {
  provider: SupportedProvider;
  model: string;
  text: string;
  inputTokens: number;
  outputTokens: number;
}

const PROVIDER_COMBINATIONS: Record<ProviderCombination, ProviderTarget[]> = {
  groq_gemini_mistral: [
    { provider: 'groq', model: GROQ_MODELS.LLAMA_3_3_70B },
    { provider: 'google', model: GEMINI_MODELS.GEMINI_2_5_FLASH },
    { provider: 'mistral', model: MISTRAL_MODELS.MISTRAL_SMALL_3_2 },
  ],
  deepseek_openai_claude: [
    { provider: 'deepseek', model: DEEPSEEK_MODELS.DEEPSEEK_REASONER },
    { provider: 'openai', model: OPENAI_MODELS.GPT_5_1 },
    { provider: 'anthropic', model: CLAUDE_MODELS.CLAUDE_SONNET_4_5 },
  ],
};

const DEFAULT_OPTIONS = { maxTokens: 4000, temperature: 0.7 } as const;

async function callGroq(options: GenerateOptions, model: string): Promise<ProviderResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: buildChatMessages(options),
      max_tokens: options.maxTokens ?? DEFAULT_OPTIONS.maxTokens,
      temperature: options.temperature ?? DEFAULT_OPTIONS.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const usage = data.usage ?? {};
  return {
    provider: 'groq',
    model,
    text: data.choices?.[0]?.message?.content ?? '',
    inputTokens: usage.prompt_tokens ?? 0,
    outputTokens: usage.completion_tokens ?? 0,
  };
}

async function callGemini(options: GenerateOptions, model: string): Promise<ProviderResponse> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });
  const fullPrompt = options.systemPrompt ? `${options.systemPrompt}\n\n${options.prompt}` : options.prompt;
  const result = await geminiModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    generationConfig: {
      maxOutputTokens: options.maxTokens ?? DEFAULT_OPTIONS.maxTokens,
      temperature: options.temperature ?? DEFAULT_OPTIONS.temperature,
    },
  });

  const response = result.response;
  return {
    provider: 'google',
    model,
    text: response.text() ?? '',
    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

async function callMistral(options: GenerateOptions, model: string): Promise<ProviderResponse> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('Missing MISTRAL_API_KEY');
  }

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: buildChatMessages(options),
      max_tokens: options.maxTokens ?? DEFAULT_OPTIONS.maxTokens,
      temperature: options.temperature ?? DEFAULT_OPTIONS.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const usage = data.usage ?? {};
  return {
    provider: 'mistral',
    model,
    text: data.choices?.[0]?.message?.content ?? '',
    inputTokens: usage.prompt_tokens ?? 0,
    outputTokens: usage.completion_tokens ?? 0,
  };
}

async function callDeepSeek(options: GenerateOptions, model: string): Promise<ProviderResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('Missing DEEPSEEK_API_KEY');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: buildChatMessages(options),
      max_tokens: options.maxTokens ?? DEFAULT_OPTIONS.maxTokens,
      temperature: options.temperature ?? DEFAULT_OPTIONS.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const usage = data.usage ?? {};
  return {
    provider: 'deepseek',
    model,
    text: data.choices?.[0]?.message?.content ?? '',
    inputTokens: usage.prompt_tokens ?? 0,
    outputTokens: usage.completion_tokens ?? 0,
  };
}

async function callOpenAI(options: GenerateOptions, model: string): Promise<ProviderResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model,
    messages: buildChatMessages(options),
    max_tokens: options.maxTokens ?? DEFAULT_OPTIONS.maxTokens,
    temperature: options.temperature ?? DEFAULT_OPTIONS.temperature,
  });

  return {
    provider: 'openai',
    model,
    text: response.choices?.[0]?.message?.content ?? '',
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}

async function callAnthropic(options: GenerateOptions, model: string): Promise<ProviderResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY');
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens ?? DEFAULT_OPTIONS.maxTokens,
    temperature: options.temperature ?? DEFAULT_OPTIONS.temperature,
    system: options.systemPrompt,
    messages: [{ role: 'user', content: options.prompt }],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return {
    provider: 'anthropic',
    model,
    text: textBlock?.type === 'text' ? textBlock.text : '',
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  };
}

const PROVIDER_HANDLERS: Record<SupportedProvider, (options: GenerateOptions, model: string) => Promise<ProviderResponse>> = {
  groq: callGroq,
  google: callGemini,
  mistral: callMistral,
  deepseek: callDeepSeek,
  openai: callOpenAI,
  anthropic: callAnthropic,
};

function buildChatMessages(options: GenerateOptions): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: options.prompt });
  return messages;
}

function extractStructuredData<T>(text: string | undefined, schema?: ZodSchema<T>) {
  if (!schema || !text) {
    return undefined;
  }

  const patterns = [
    /```json\s*([\s\S]*?)\s*```/i,
    /```\s*([\s\S]*?)\s*```/i,
    /(\{[\s\S]*\})/,
    /(\[[\s\S]*\])/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[1]);
      return schema.parse(parsed);
    } catch {
      // Continue trying other patterns
    }
  }

  return undefined;
}

export class UnifiedLLMClient {
  private readonly combination: ProviderCombination;
  private readonly tracker: CostTracker;

  constructor(combination: ProviderCombination = 'groq_gemini_mistral', tracker: CostTracker = new CostTracker()) {
    this.combination = combination;
    this.tracker = tracker;
  }

  async generateText<TSchema = unknown>(options: GenerateOptions<TSchema>): Promise<GenerateResult<TSchema>> {
    const providers = PROVIDER_COMBINATIONS[this.combination];
    const errors: string[] = [];

    for (const target of providers) {
      try {
        const handler = PROVIDER_HANDLERS[target.provider];
        if (!handler) continue;

        const response = await handler(options, target.model);
        const cleanedText = response.text?.trim() ?? '';
        if (!cleanedText) {
          throw new Error('Empty response text');
        }
        const data = extractStructuredData(cleanedText, options.schema);

        this.tracker.track({
          provider: mapProviderToId(response.provider),
          model: response.model,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          metadata: { combination: this.combination, provider: response.provider },
        });

        return {
          success: true,
          text: cleanedText,
          data,
          provider: response.provider,
          model: response.model,
          usage: { inputTokens: response.inputTokens, outputTokens: response.outputTokens },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${target.provider}: ${message}`);
        await delayBetweenProviders();
      }
    }

    return { success: false, error: `All providers failed → ${errors.join(' | ')}` };
  }

  getAvailableProviders(): SupportedProvider[] {
    return PROVIDER_COMBINATIONS[this.combination].map(target => target.provider);
  }

  getCostTracker(): CostTracker {
    return this.tracker;
  }
}

function mapProviderToId(provider: SupportedProvider): ProviderId {
  if (provider === 'google') return 'google';
  if (provider === 'groq') return 'groq';
  if (provider === 'mistral') return 'mistral';
  if (provider === 'deepseek') return 'deepseek';
  if (provider === 'openai') return 'openai';
  return 'anthropic';
}

async function delayBetweenProviders() {
  await new Promise(resolve => setTimeout(resolve, 800));
}

export function createLLMClient(combination?: ProviderCombination, tracker?: CostTracker) {
  return new UnifiedLLMClient(combination, tracker);
}
