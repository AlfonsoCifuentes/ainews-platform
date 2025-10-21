import { z } from 'zod';

export const generateOptionsSchema = z.object({
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(8000).optional(),
  topP: z.number().min(0).max(1).default(1),
  frequencyPenalty: z.number().min(-2).max(2).default(0),
  presencePenalty: z.number().min(-2).max(2).default(0),
  stop: z.array(z.string()).optional(),
});

export type GenerateOptions = z.infer<typeof generateOptionsSchema>;

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export class LLMClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async generate(
    prompt: string,
    options?: Partial<GenerateOptions>,
  ): Promise<LLMResponse> {
    const validatedOptions = generateOptionsSchema.parse(options ?? {});

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: validatedOptions.temperature,
        max_tokens: validatedOptions.maxTokens,
        top_p: validatedOptions.topP,
        frequency_penalty: validatedOptions.frequencyPenalty,
        presence_penalty: validatedOptions.presencePenalty,
        stop: validatedOptions.stop,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `LLM API request failed: ${response.status} ${response.statusText}\n${errorText}`,
      );
    }

    const data = await response.json();

    return {
      content: data.choices[0]?.message?.content ?? '',
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      finishReason: data.choices[0]?.finish_reason ?? 'unknown',
    };
  }

  async classify<T>(
    text: string,
    schema: z.ZodSchema<T>,
    systemPrompt?: string,
  ): Promise<T> {
    const prompt = systemPrompt
      ? `${systemPrompt}\n\nClassify the following:\n${text}`
      : text;

    const response = await this.generate(prompt, {
      temperature: 0.3,
      maxTokens: 500,
    });

    try {
      const parsed = JSON.parse(response.content);
      return schema.parse(parsed);
    } catch (error) {
      throw new Error(
        `Failed to parse LLM classification response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

export function createLLMClient(
  provider: 'openrouter' | 'groq',
  model?: string,
): LLMClient {
  const apiKey =
    provider === 'openrouter'
      ? process.env.OPENROUTER_API_KEY
      : process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      `Missing API key for ${provider}. Set ${provider === 'openrouter' ? 'OPENROUTER_API_KEY' : 'GROQ_API_KEY'} environment variable.`,
    );
  }

  const baseUrl =
    provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1'
      : 'https://api.groq.com/openai/v1';

  const defaultModel =
    provider === 'openrouter'
      ? 'meta-llama/llama-3.1-8b-instruct:free'
      : 'llama-3.1-8b-instant';

  return new LLMClient(apiKey, baseUrl, model ?? defaultModel);
}
