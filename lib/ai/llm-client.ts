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

/**
 * Cleans LLM response content by removing markdown code fences and extracting JSON
 */
function cleanLLMResponse(content: string): string {
  let cleaned = content.trim();
  
  // Remove markdown code fences if present (```json ... ``` or ``` ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  
  return cleaned.trim();
}

export class LLMClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly provider: 'openrouter' | 'groq' | 'gemini' = 'openrouter',
  ) {}

  async generate(
    prompt: string,
    options?: Partial<GenerateOptions>,
  ): Promise<LLMResponse> {
    const validatedOptions = generateOptionsSchema.parse(options ?? {});

    // Gemini has a different API structure
    if (this.provider === 'gemini') {
      return this.generateGemini(prompt, validatedOptions);
    }

    // OpenRouter and Groq use OpenAI-compatible API
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...(this.provider === 'openrouter' && {
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://ainews-platform.vercel.app',
          'X-Title': 'AI News Platform'
        })
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

    const rawContent = data.choices[0]?.message?.content ?? '';
    
    return {
      content: cleanLLMResponse(rawContent),
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      finishReason: data.choices[0]?.finish_reason ?? 'unknown',
    };
  }

  private async generateGemini(
    prompt: string,
    options: GenerateOptions,
  ): Promise<LLMResponse> {
    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: options.temperature,
            maxOutputTokens: options.maxTokens || 4000,
            topP: options.topP,
            stopSequences: options.stop,
          },
        }),
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemini API request failed: ${response.status} ${response.statusText}\n${errorText}`,
      );
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    
    return {
      content: cleanLLMResponse(rawContent),
      model: this.model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
      },
      finishReason: data.candidates?.[0]?.finishReason ?? 'unknown',
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

      // Response content is already cleaned by generate()
      // Just try to extract JSON object if there's extra text
      let jsonContent = response.content;
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

export type LLMProvider = 'openrouter' | 'groq' | 'gemini';

export function createLLMClient(
  provider: LLMProvider,
  model?: string,
): LLMClient {
  let apiKey: string | undefined;
  let baseUrl: string;
  let defaultModel: string;

  switch (provider) {
    case 'openrouter':
      apiKey = process.env.OPENROUTER_API_KEY;
      baseUrl = 'https://openrouter.ai/api/v1';
      defaultModel = 'google/gemini-2.0-flash-exp:free';
      break;
    
    case 'groq':
      apiKey = process.env.GROQ_API_KEY;
      baseUrl = 'https://api.groq.com/openai/v1';
      defaultModel = 'llama-3.1-8b-instant';
      break;
    
    case 'gemini':
      apiKey = process.env.GEMINI_API_KEY;
      baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
      defaultModel = 'gemini-2.0-flash-exp';
      break;
  }

  if (!apiKey) {
    throw new Error(
      `Missing API key for ${provider}. Set ${provider.toUpperCase()}_API_KEY environment variable.`,
    );
  }

  return new LLMClient(apiKey, baseUrl, model ?? defaultModel, provider);
}

/**
 * Create LLM client with automatic fallback to available providers
 * Tries providers in order: Gemini → OpenRouter → Groq
 */
export function createLLMClientWithFallback(): LLMClient {
  const providers: LLMProvider[] = ['gemini', 'openrouter', 'groq'];
  
  for (const provider of providers) {
    try {
      const client = createLLMClient(provider);
      console.log(`[LLM] Using ${provider} provider`);
      return client;
    } catch (error) {
      console.warn(`[LLM] ${provider} not available:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  throw new Error(
    'No LLM providers available. Please configure at least one: GEMINI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY'
  );
}

/**
 * Get list of available LLM providers
 */
export function getAvailableProviders(): LLMProvider[] {
  const available: LLMProvider[] = [];
  
  if (process.env.GEMINI_API_KEY) available.push('gemini');
  if (process.env.OPENROUTER_API_KEY) available.push('openrouter');
  if (process.env.GROQ_API_KEY) available.push('groq');
  
  return available;
}
