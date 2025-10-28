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
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(60000), // 60 seconds for LLM generation
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

    try {
      const response = await this.generate(prompt, {
        temperature: 0.3,
        maxTokens: 4000, // Increased for complex schemas like course generation
      });

      // Clean up the response content to extract JSON
      let jsonContent = response.content.trim();
      
      // Remove markdown code fences if present
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      // Try to find JSON object if there's extra text
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonContent);
      return schema.parse(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `LLM response doesn't match schema: ${JSON.stringify(error.errors.slice(0, 3))}`,
        );
      }
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

  // Updated to working free models
  const defaultModel =
    provider === 'openrouter'
      ? 'google/gemini-2.0-flash-exp:free' // Gemini 2.0 Flash is fast and free
      : 'llama-3.1-8b-instant';

  return new LLMClient(apiKey, baseUrl, model ?? defaultModel);
}
