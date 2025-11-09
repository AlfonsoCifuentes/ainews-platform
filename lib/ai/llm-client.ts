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
    private readonly provider: LLMProvider = 'openrouter',
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

    // Anthropic has a different API structure
    if (this.provider === 'anthropic') {
      return this.generateAnthropic(prompt, validatedOptions);
    }

    // OpenRouter, Groq, Together, DeepSeek, Mistral use OpenAI-compatible API
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
    const generationConfig: Record<string, unknown> = {
      temperature: options.temperature,
      maxOutputTokens: options.maxTokens || 4000,
      topP: options.topP,
    };

    // Force JSON mode for Gemini to prevent markdown formatting
    if (prompt.toLowerCase().includes('json') || prompt.includes('{')) {
      generationConfig.responseMimeType = 'application/json';
    }

    if (options.stop) {
      generationConfig.stopSequences = options.stop;
    }

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
          generationConfig,
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

  private async generateAnthropic(
    prompt: string,
    options: GenerateOptions,
  ): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature,
        top_p: options.topP,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        ...(options.stop && { stop_sequences: options.stop }),
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Anthropic API request failed: ${response.status} ${response.statusText}\n${errorText}`,
      );
    }

    const data = await response.json();
    const rawContent = data.content?.[0]?.text ?? '';

    return {
      content: cleanLLMResponse(rawContent),
      model: data.model,
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
      finishReason: data.stop_reason ?? 'unknown',
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

    let llmResponse: LLMResponse | null = null;
    
    try {
      llmResponse = await this.generate(prompt, {
        temperature: 0.3,
        maxTokens: 4000, // Increased for complex schemas like course generation
      });

      // Response content is already cleaned by generate()
      // Try multiple strategies to extract valid JSON
      let jsonContent = llmResponse.content;
      
      // Strategy 1: Extract JSON object with regex (greedy match for nested objects)
      const jsonMatch = jsonContent.match(/\{(?:[^{}]|\{[^{}]*\})*\}/s);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }
      
      // Strategy 2: If still contains markdown formatting, try to find JSON array
      if (jsonContent.includes('**') || jsonContent.includes('Based on')) {
        const arrayMatch = jsonContent.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          jsonContent = arrayMatch[0];
        } else {
          // Last resort: try to find any valid JSON structure
          const cleanMatch = jsonContent.match(/(\{[\s\S]*?\}|\[[\s\S]*?\])/);
          if (cleanMatch) {
            jsonContent = cleanMatch[0];
          }
        }
      }

      const parsed = JSON.parse(jsonContent);
      return schema.parse(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `LLM response doesn't match schema: ${JSON.stringify(error.errors.slice(0, 3))}`,
        );
      }
      
      // Log the problematic response for debugging
      if (llmResponse) {
        console.error('[LLM] Raw response that failed to parse:', llmResponse.content.substring(0, 200));
      }
      
      throw new Error(
        `Failed to parse LLM classification response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

export type LLMProvider = 'openrouter' | 'groq' | 'gemini' | 'anthropic' | 'together' | 'deepseek' | 'mistral';

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

    case 'anthropic':
      apiKey = process.env.ANTHROPIC_API_KEY;
      baseUrl = 'https://api.anthropic.com/v1';
      defaultModel = 'claude-3-5-sonnet-20241022';
      break;

    case 'together':
      apiKey = process.env.TOGETHER_API_KEY;
      baseUrl = 'https://api.together.xyz/v1';
      defaultModel = 'meta-llama/Llama-3.2-70B-Instruct-Turbo';
      break;

    case 'deepseek':
      apiKey = process.env.DEEPSEEK_API_KEY;
      baseUrl = 'https://api.deepseek.com/v1';
      defaultModel = 'deepseek-chat';
      break;

    case 'mistral':
      apiKey = process.env.MISTRAL_API_KEY;
      baseUrl = 'https://api.mistral.ai/v1';
      defaultModel = 'mistral-large-latest';
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
 * Tries providers in order: Anthropic → Gemini → OpenRouter → Groq → Together → DeepSeek → Mistral
 */
export function createLLMClientWithFallback(): LLMClient {
  const providers: LLMProvider[] = [
    'anthropic', // Best for JSON responses
    'gemini',    // Google's Gemini
    'openrouter', // Multi-provider
    'groq',      // Fast inference
    'together',  // Meta models
    'deepseek',  // Chinese provider
    'mistral'    // European provider
  ];

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
    'No LLM providers available. Please configure at least one API key: ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, TOGETHER_API_KEY, DEEPSEEK_API_KEY, or MISTRAL_API_KEY'
  );
}

/**
 * Get list of available LLM providers
 */
export function getAvailableProviders(): LLMProvider[] {
  const available: LLMProvider[] = [];

  if (process.env.ANTHROPIC_API_KEY) available.push('anthropic');
  if (process.env.GEMINI_API_KEY) available.push('gemini');
  if (process.env.OPENROUTER_API_KEY) available.push('openrouter');
  if (process.env.GROQ_API_KEY) available.push('groq');
  if (process.env.TOGETHER_API_KEY) available.push('together');
  if (process.env.DEEPSEEK_API_KEY) available.push('deepseek');
  if (process.env.MISTRAL_API_KEY) available.push('mistral');

  return available;
}
