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

export type LLMProvider =
  | 'ollama'
  | 'openai'
  | 'openrouter'
  | 'groq'
  | 'gemini'
  | 'anthropic'
  | 'together'
  | 'deepseek'
  | 'mistral';

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
 * Rate limit configuration for exponential backoff
 */
interface RateLimitConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
}

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRetries: 5,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 60000,    // 60 seconds
  backoffMultiplier: 2,
  jitterMs: 500,        // Random jitter to prevent thundering herd
};

/**
 * Calculate delay for exponential backoff with jitter
 */
function calculateBackoffDelay(
  attempt: number,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG
): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  const jitter = Math.random() * config.jitterMs;
  return cappedDelay + jitter;
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

type LLMErrorMetadata = {
  provider?: LLMProvider;
  status?: number;
  retryAfterMs?: number;
  rawBody?: string;
};

class LLMProviderError extends Error {
  constructor(message: string, readonly metadata: LLMErrorMetadata = {}) {
    super(message);
    this.name = 'LLMProviderError';
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return numeric <= 3600 ? numeric * 1000 : numeric; // Header may be seconds or ms
  }

  const date = Date.parse(value);
  if (!Number.isNaN(date)) {
    const diff = date - Date.now();
    return diff > 0 ? diff : undefined;
  }

  return undefined;
}

function extractRetryAfterFromBody(body: string | undefined): number | undefined {
  if (!body) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(body);
    const raw = parsed?.retry_after ?? parsed?.error?.retry_after;
    if (typeof raw === 'number' && raw >= 0) {
      return raw <= 3600 ? raw * 1000 : raw;
    }
    const asString = parsed?.error?.message ?? parsed?.message;
    if (typeof asString === 'string') {
      const match = asString.match(/retry(?:-|\s*)after[:\s]+(\d+)/i);
      if (match) {
        const value = Number(match[1]);
        if (Number.isFinite(value)) {
          return value <= 3600 ? value * 1000 : value;
        }
      }
    }
  } catch {
    // ignore body parse failures
  }

  return undefined;
}

export class LLMClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly provider: LLMProvider = 'openrouter',
  ) {}

  /**
   * Fetch with automatic rate limit handling and exponential backoff
   */
  private async fetchWithRateLimitRetry(
    url: string,
    options: RequestInit,
    config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        // Success - return response
        if (response.ok) {
          if (attempt > 0) {
            console.log(`[LLM RateLimit] ✅ Request succeeded after ${attempt} retries`);
          }
          return response;
        }

        // Handle rate limit (429)
        if (response.status === 429) {
          const errorText = await response.text();
          
          // Extract retry-after from headers or body
          const retryAfterMs =
            parseRetryAfter(response.headers.get('retry-after')) ??
            extractRetryAfterFromBody(errorText);

          // CRITICAL: NEVER retry 429 internally!
          // Rate limits mean the provider is exhausted. Retrying after 1,2,4,8,16 seconds
          // WON'T help because rate limits last MINUTES or HOURS.
          // Instead, fail immediately so classifyWithAllProviders can try the next provider.
          console.warn(`[LLM RateLimit] ⚠️  Rate limited (429) - failing immediately to try next provider`);
          throw new LLMProviderError(
            `Rate limit exceeded. ${errorText}`,
            {
              provider: this.provider,
              status: 429,
              retryAfterMs,
              rawBody: errorText,
            }
          );
        }

        // Other HTTP errors - throw immediately
        const errorText = await response.text();
        throw new LLMProviderError(
          `LLM API request failed: ${response.status} ${response.statusText}\n${errorText}`,
          {
            provider: this.provider,
            status: response.status,
            rawBody: errorText,
          }
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If it's already an LLMProviderError, rethrow it
        if (error instanceof LLMProviderError) {
          throw error;
        }

        // Network/timeout errors - retry with exponential backoff
        const isNetworkError =
          lastError.message.includes('fetch') ||
          lastError.message.includes('network') ||
          lastError.message.includes('ECONNREFUSED') ||
          lastError.message.includes('ETIMEDOUT') ||
          lastError.message.includes('aborted');

        if (isNetworkError && attempt < config.maxRetries) {
          const delayMs = calculateBackoffDelay(attempt, config);
          console.warn(
            `[LLM Network] ⚠️  Network error: ${lastError.message}. ` +
            `Retrying in ${delayMs.toFixed(0)}ms (${attempt + 1}/${config.maxRetries})`
          );
          await sleep(delayMs);
          continue; // Retry
        }

        // Non-retryable error or max retries exceeded
        throw lastError;
      }
    }

    // Should never reach here, but just in case
    throw lastError || new Error('Max retries exceeded');
  }

  async generate(
    prompt: string,
    options?: Partial<GenerateOptions>,
  ): Promise<LLMResponse> {
    const validatedOptions = generateOptionsSchema.parse(options ?? {});

    // Gemini has a different API structure
    if (this.provider === 'gemini') {
      return this.generateGemini(prompt, validatedOptions);
    }

    // Ollama has a different API structure
    if (this.provider === 'ollama') {
      return this.generateOllama(prompt, validatedOptions);
    }

    // Anthropic has a different API structure
    if (this.provider === 'anthropic') {
      return this.generateAnthropic(prompt, validatedOptions);
    }

    // OpenRouter, Groq, Together, DeepSeek, Mistral use OpenAI-compatible API
    const response = await this.fetchWithRateLimitRetry(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          ...(this.provider === 'openrouter' && {
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://thotnet-core.vercel.app',
            'X-Title': 'ThotNet Core Platform'
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
      }
    );

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

    const response = await this.fetchWithRateLimitRetry(
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
    const response = await this.fetchWithRateLimitRetry(
      `${this.baseUrl}/messages`,
      {
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
      }
    );

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

  private async generateOllama(
    prompt: string,
    options: GenerateOptions,
  ): Promise<LLMResponse> {
    const response = await this.fetchWithRateLimitRetry(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          stream: false,
          options: {
            temperature: options.temperature,
            top_p: options.topP,
            num_predict: options.maxTokens || 4000,
            stop: options.stop,
          },
        }),
        signal: AbortSignal.timeout(120000), // 2 minutes for local Ollama
      }
    );

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content ?? '';

    return {
      content: cleanLLMResponse(rawContent),
      model: data.model || this.model,
      usage: {
        promptTokens: data.usage?.prompt_eval_count ?? 0,
        completionTokens: data.usage?.eval_count ?? 0,
        totalTokens: (data.usage?.prompt_eval_count ?? 0) + (data.usage?.eval_count ?? 0),
      },
      finishReason: data.choices?.[0]?.finish_reason ?? 'unknown',
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
    let jsonContent = '';
    
    try {
      // Log when using Ollama to show local generation
      if (this.provider === 'ollama') {
        console.log(`[LLM] 🏠 Using local Ollama model: ${this.model} (ZERO API COST)`);
      }
      
      llmResponse = await this.generate(prompt, {
        temperature: 0.3,
        maxTokens: 4000, // Increased for complex schemas like course generation
      });

      // Response content is already cleaned by generate()
      // Try multiple strategies to extract valid JSON
      jsonContent = llmResponse.content;
      
      // Early check: if response clearly looks like an error message, fail fast
      const firstChars = jsonContent.trim().substring(0, 50).toLowerCase();
      if (!firstChars.startsWith('{') && !firstChars.startsWith('[')) {
        if (firstChars.startsWith('error') || 
            firstChars.startsWith('an error') ||
            firstChars.startsWith('sorry') ||
            firstChars.startsWith('i cannot') ||
            firstChars.startsWith('unable') ||
            firstChars.startsWith('failed')) {
          console.error('[LLM] ❌ LLM returned error text instead of JSON:', jsonContent.substring(0, 300));
          throw new Error(
            `LLM returned error text instead of JSON: "${jsonContent.substring(0, 200)}..."`
          );
        }
      }
      
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

      // Strategy 3: Fix malformed Unicode escapes that come from Ollama
      // Replace invalid \uXXsY patterns with proper UTF-8 encoding
      jsonContent = jsonContent.replace(/\\u00([0-9a-fA-F]{2})s([0-9a-fA-F])/g, (_match, hex1) => {
        // These are usually UTF-8 sequences - try to decode properly
        const charCode = parseInt(hex1, 16);
        return String.fromCharCode(charCode);
      });
      
      // Fix incomplete escapes at end of strings
      jsonContent = jsonContent.replace(/"([^"]*?)\\u00[0-9a-fA-F]{0,3}$/g, '"$1"');

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
        console.error('[LLM] ❌ Raw response that failed to parse:');
        console.error('[LLM] First 500 chars:', llmResponse.content.substring(0, 500));
        console.error('[LLM] Last 200 chars:', llmResponse.content.substring(Math.max(0, llmResponse.content.length - 200)));
        
        // Check if the response looks like an error message instead of JSON
        const lowerContent = llmResponse.content.toLowerCase();
        if (lowerContent.includes('error') || lowerContent.includes('failed') || 
            lowerContent.includes('cannot') || lowerContent.includes('unable')) {
          throw new Error(
            `LLM returned an error message instead of JSON: ${llmResponse.content.substring(0, 200)}`
          );
        }
      }
      
      throw new Error(
        `Failed to parse LLM classification response: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Received: "${jsonContent.substring(0, 100)}..."`
      );
    }
  }
}

const providerCooldowns = new Map<LLMProvider, number>();

const GENERAL_BACKOFF_MS = 750;
const TIMEOUT_BACKOFF_MS = 2000;
const RATE_LIMIT_BASE_MS = 500; // Reduced from 5000 for faster provider switching
const RATE_LIMIT_MAX_MS = 3000; // Reduced from 20000 for faster failover

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function addJitter(ms: number): number {
  const jitter = Math.floor(ms * 0.2 * Math.random());
  return ms + jitter;
}

function computeBackoffMs(
  error: ReturnType<typeof classifyLLMError>,
  attempt: number,
): number {
  if (error.type === 'rate_limit') {
    const base = RATE_LIMIT_BASE_MS * Math.max(attempt, 1);
    const withRetryAfter = error.retryAfterMs ? Math.max(base, error.retryAfterMs) : base;
    const ceiling = error.retryAfterMs ? Math.max(error.retryAfterMs, RATE_LIMIT_MAX_MS) : RATE_LIMIT_MAX_MS;
    return addJitter(Math.min(withRetryAfter, ceiling));
  }

  if (error.type === 'timeout') {
    return addJitter(Math.min(TIMEOUT_BACKOFF_MS * Math.max(attempt, 1), 8000));
  }

  return addJitter(Math.min(GENERAL_BACKOFF_MS * Math.max(attempt, 1), 4000));
}

export function createLLMClient(
  provider: LLMProvider,
  model?: string,
): LLMClient {
  let apiKey: string | undefined;
  let baseUrl: string;
  let defaultModel: string;

  switch (provider) {
    case 'ollama':
      // Ollama doesn't need API key, uses local instance
      apiKey = 'ollama-local';
      baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
      defaultModel = 'llama3.2:3b'; // Small, fast model for development
      break;

    case 'openai':
      apiKey = process.env.OPENAI_API_KEY;
      baseUrl = 'https://api.openai.com/v1';
      defaultModel = 'gpt-4o';
      break;

    case 'openrouter':
      apiKey = process.env.OPENROUTER_API_KEY;
      baseUrl = 'https://openrouter.ai/api/v1';
      // OpenRouter provides access to latest models from multiple providers
      // Priority: Latest Gemini 2.0 Flash (free tier, excellent for JSON)
      // Alternatives: google/gemini-2.0-flash-thinking-exp:free, anthropic/claude-3.7-sonnet
      defaultModel = 'google/gemini-2.0-flash-exp:free';
      break;

    case 'groq':
      apiKey = process.env.GROQ_API_KEY;
      baseUrl = 'https://api.groq.com/openai/v1';
      // Llama 3.3 70B Versatile (latest from Meta, Dec 2024) - best balance of speed and quality
      defaultModel = 'llama-3.3-70b-versatile';
      break;

    case 'gemini':
      apiKey = process.env.GEMINI_API_KEY;
      baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
      // Gemini 2.0 Flash (latest stable, Dec 2024) - faster and smarter than 1.5 Pro
      // Using stable model, not experimental, to ensure availability
      // Model evolution: gemini-2.0-flash-exp → gemini-1.5-flash → gemini-1.5-pro
      defaultModel = model || 'gemini-1.5-flash-latest';
      break;

    case 'anthropic':
      apiKey = process.env.ANTHROPIC_API_KEY;
      baseUrl = 'https://api.anthropic.com/v1';
      // Claude 3.5 Sonnet (latest stable) - best reasoning and JSON generation
      // Updated version with better performance (Oct 2024)
      defaultModel = 'claude-3-5-sonnet-20241022';
      break;

    case 'together':
      apiKey = process.env.TOGETHER_API_KEY;
      baseUrl = 'https://api.together.xyz/v1';
      // Llama 3.3 70B Instruct (latest from Meta, Dec 2024)
      defaultModel = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
      break;

    case 'deepseek':
      apiKey = process.env.DEEPSEEK_API_KEY;
      baseUrl = 'https://api.deepseek.com/v1';
      // DeepSeek V3 (latest, Dec 2024) - 671B MoE model, GPT-4 level performance
      defaultModel = 'deepseek-chat';
      break;

    case 'mistral':
      apiKey = process.env.MISTRAL_API_KEY;
      baseUrl = 'https://api.mistral.ai/v1';
      // Mistral Large 2 (latest, 2024) - 123B params, multilingual, best for reasoning
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
 * Detect and prepare local Ollama model
 * If Ollama is running but model isn't pulled, attempts to download it
 * Model: llama2:7b (4GB download, ~2.7GB compressed, good quality/size ratio)
 */
async function prepareLocalModel(): Promise<boolean> {
  try {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const MODEL = 'llama2:7b';

    // Step 1: Check if Ollama is running
    const tagsResponse = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000)
    });

    if (!tagsResponse.ok) {
      console.warn('[LOCAL] Ollama not responding, skipping local model');
      return false;
    }

    const tagsData = await tagsResponse.json() as { models?: Array<{ name: string }> };
    const models = tagsData.models || [];
    const hasModel = models.some(m => m.name.includes('llama2'));

    if (hasModel) {
      console.log('[LOCAL] ✓ Llama2 model already available locally');
      return true;
    }

    // Step 2: Model not found - attempt to pull it
    console.log(`[LOCAL] 📥 Llama2 model not found. Downloading ${MODEL}...`);
    console.log('[LOCAL] ⏳ This may take 5-15 minutes (one-time download, ~2.7GB)');

    const pullResponse = await fetch(`${ollamaUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: MODEL }),
      signal: AbortSignal.timeout(3600000) // 1 hour timeout for download
    });

    if (!pullResponse.ok) {
      console.error('[LOCAL] Failed to pull model:', pullResponse.statusText);
      return false;
    }

    // Stream the download progress
    const reader = pullResponse.body?.getReader();
    if (!reader) {
      console.error('[LOCAL] No response body for model download');
      return false;
    }

    const decoder = new TextDecoder();
    let lastLog = Date.now();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.trim());

        // Log progress every 5 seconds to avoid spam
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.status && (Date.now() - lastLog > 5000)) {
              console.log(`[LOCAL] ${data.status}${data.total ? ` (${(data.completed / data.total * 100).toFixed(0)}%)` : ''}`);
              lastLog = Date.now();
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    console.log('[LOCAL] ✓ Llama2 model download complete!');
    return true;
  } catch (error) {
    console.warn(
      '[LOCAL] Could not prepare local model:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return false;
  }
}

/**
 * Create LLM client with automatic fallback to available providers
 * Priority: Ollama (local) → Cloud providers → Auto-download local model as last resort
 */
export async function createLLMClientWithFallback(): Promise<LLMClient> {
  const isVercel = process.env.VERCEL === '1';

  // ALWAYS try Ollama FIRST (local model) - no API costs!
  // Only skip on Vercel where local services aren't available
  if (!isVercel) {
    try {
      // Quick check if Ollama is running
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });

      if (response.ok) {
        const ollamaClient = createLLMClient('ollama');
        console.log('[LLM] ✓ Using Ollama provider (LOCAL MODEL - NO API COSTS)');
        return ollamaClient;
      } else {
        console.warn('[LLM] Ollama API responded but not OK, falling back to cloud providers');
      }
    } catch (error) {
      console.warn('[LLM] Ollama not available, falling back to cloud providers:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Fallback to cloud providers (ordered by: reliability + free tier generosity)
  const providers: LLMProvider[] = [
    'groq',       // FIRST - Groq is FAST and has generous free tier (30 req/min), rarely rate limited
    'openrouter', // SECOND - Multi-provider with many free models available
    'gemini',     // THIRD - Google Gemini 2.0 Flash Lite (stable, good free tier)
    'together',   // FOURTH - Together.ai Meta models - Good free tier
    'deepseek',   // FIFTH - DeepSeek Chat - Alternative Chinese provider
    'mistral',    // SIXTH - Mistral Large - European provider
    'openai',     // SEVENTH - OpenAI (if quota available, premium quality)
    'anthropic',  // EIGHTH - Anthropic Claude (if quota available, best for JSON)
  ];

  for (const provider of providers) {
    try {
      const client = createLLMClient(provider);
      console.log(`[LLM] ✓ Using ${provider} provider (attempting ${providers.indexOf(provider) + 1}/${providers.length})`);
      return client;
    } catch (error) {
      console.warn(`[LLM] ✗ ${provider} not available (${providers.indexOf(provider) + 1}/${providers.length} failed):`, error instanceof Error ? error.message : 'Unknown error');
      // Continue to next provider immediately
    }
  }

  // LAST RESORT: Try to use/download local model
  if (!isVercel) {
    console.log('[LLM] ⚠️  All cloud providers exhausted. Attempting to use local model...');
    const localReady = await prepareLocalModel();
    if (localReady) {
      try {
        const ollamaClient = createLLMClient('ollama');
        console.log('[LLM] ✓ Using local Llama2 model (LAST RESORT FALLBACK)');
        return ollamaClient;
      } catch (error) {
        console.error('[LLM] Failed to create Ollama client:', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  throw new Error(
    'No LLM providers available. ' +
    (!isVercel
      ? 'All options failed. Try: 1) Install Ollama (https://ollama.ai), 2) Set at least one API key (GROQ_API_KEY, GEMINI_API_KEY, etc.)'
      : 'Please configure at least one API key: GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, TOGETHER_API_KEY, MISTRAL_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, or ANTHROPIC_API_KEY'
    )
  );
}

/**
 * Get list of available LLM providers
 * Priority order: Ollama (local OR remote via tunnel) → Cloud providers (by quality/cost)
 */
export function getAvailableProviders(): LLMProvider[] {
  const available: LLMProvider[] = [];

  // ALWAYS try Ollama FIRST - even on Vercel if OLLAMA_BASE_URL is configured
  // This allows using Ollama via ngrok/cloudflare tunnel from Vercel
  const ollamaUrl = process.env.OLLAMA_BASE_URL;
  const hasOllamaUrl = !!ollamaUrl;
  
  if (hasOllamaUrl || process.env.VERCEL !== '1') {
    available.push('ollama');
    const location = hasOllamaUrl ? `remote (${ollamaUrl})` : 'local';
    console.log(`[LLM] 🎯 Ollama added as PRIMARY provider (${location}, zero cost)`);
  }

  // Cloud providers ordered by: free tier generosity + reliability
  // PRIMARY CLOUD PROVIDERS (in order):
  
  // Google Gemini 3: Best free tier, fast, excellent for JSON
  if (process.env.GEMINI_API_KEY) {
    available.push('gemini');
    console.log(`[LLM] ✅ Gemini configured and available (PRIMARY CLOUD)`);
  }
  
  // OpenAI: GPT-4o and GPT-4 Turbo - premium models with excellent quality
  if (process.env.OPENAI_API_KEY) {
    available.push('openai');
    console.log(`[LLM] ✅ OpenAI configured and available`);
  }
  
  // Groq: 30 requests/minute free (most generous for JSON generation tasks)
  if (process.env.GROQ_API_KEY) {
    available.push('groq');
    console.log(`[LLM] ✅ Groq configured and available`);
  }
  
  // OpenRouter: Multi-provider with good free models
  if (process.env.OPENROUTER_API_KEY) {
    available.push('openrouter');
    console.log(`[LLM] ✅ OpenRouter configured and available`);
  }
  
  // SECONDARY CLOUD PROVIDERS:
  
  // Anthropic: Best for JSON but lower free tier limits
  if (process.env.ANTHROPIC_API_KEY) {
    available.push('anthropic');
    console.log(`[LLM] ✅ Anthropic configured and available`);
  }
  
  // DeepSeek: High quality but may hit limits faster
  if (process.env.DEEPSEEK_API_KEY) {
    available.push('deepseek');
    console.log(`[LLM] ✅ DeepSeek configured and available`);
  }
  
  // Mistral: European provider
  if (process.env.MISTRAL_API_KEY) {
    available.push('mistral');
    console.log(`[LLM] ✅ Mistral configured and available`);
  }
  
  // Together: Meta models
  if (process.env.TOGETHER_API_KEY) {
    available.push('together');
    console.log(`[LLM] ✅ Together configured and available`);
  }

  console.log(`[LLM] 📊 Total available providers: ${available.length}`);
  return available;
}

/**
 * Enhanced error classifier to determine error type and provide actionable feedback
 */
type ClassifiedLLMError = {
  type: 'rate_limit' | 'auth' | 'timeout' | 'network' | 'validation' | 'config' | 'unknown';
  message: string;
  retryable: boolean;
  providerSpecific?: string;
  retryAfterMs?: number;
  provider?: LLMProvider;
  status?: number;
};

export function classifyLLMError(error: unknown): ClassifiedLLMError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorLower = errorMessage.toLowerCase();
  const metadata = error instanceof LLMProviderError ? error.metadata : undefined;
  const status = metadata?.status;

  // Rate limit errors
  if (
    status === 429 ||
    errorLower.includes('rate limit') ||
    errorLower.includes('too many requests') ||
    errorLower.includes('429') ||
    errorLower.includes('quota')
  ) {
    return {
      type: 'rate_limit',
      message: `Rate limit exceeded. ${errorMessage}`,
      retryable: true,
      providerSpecific: errorMessage,
      retryAfterMs: metadata?.retryAfterMs,
      provider: metadata?.provider,
      status
    };
  }

  // Authentication errors
  if (
    errorLower.includes('unauthorized') ||
    errorLower.includes('401') ||
    errorLower.includes('api key') ||
    errorLower.includes('authentication') ||
    errorLower.includes('invalid key')
  ) {
    return {
      type: 'auth',
      message: `Authentication failed. Check your API key configuration. ${errorMessage}`,
      retryable: false,
      providerSpecific: errorMessage,
      provider: metadata?.provider,
      status
    };
  }

  // Timeout errors
  if (
    errorLower.includes('timeout') ||
    errorLower.includes('timed out') ||
    errorLower.includes('aborted')
  ) {
    return {
      type: 'timeout',
      message: `Request timeout. The AI model took too long to respond. ${errorMessage}`,
      retryable: true,
      providerSpecific: errorMessage,
      provider: metadata?.provider,
      status
    };
  }

  // Network errors
  if (
    errorLower.includes('network') ||
    errorLower.includes('fetch failed') ||
    errorLower.includes('econnrefused') ||
    errorLower.includes('enotfound')
  ) {
    return {
      type: 'network',
      message: `Network error. Cannot reach the AI provider. ${errorMessage}`,
      retryable: true,
      providerSpecific: errorMessage,
      provider: metadata?.provider,
      status
    };
  }

  // Validation errors (Zod + JSON parsing)
  if (error instanceof z.ZodError || 
      errorLower.includes('validation') || 
      errorLower.includes('schema') ||
      errorLower.includes('json') ||
      errorLower.includes('parse') ||
      errorLower.includes('unexpected token') ||
      errorLower.includes('returned error text')) {
    return {
      type: 'validation',
      message: `Response validation failed. The AI returned malformed or invalid data. ${errorMessage}`,
      retryable: true,
      providerSpecific: errorMessage,
      provider: metadata?.provider,
      status
    };
  }

  // Configuration errors
  if (errorLower.includes('missing api key') || errorLower.includes('not configured')) {
    return {
      type: 'config',
      message: `Provider not configured. ${errorMessage}`,
      retryable: false,
      providerSpecific: errorMessage,
      provider: metadata?.provider,
      status
    };
  }

  return {
    type: 'unknown',
    message: errorMessage,
    retryable: true,
    providerSpecific: errorMessage,
    provider: metadata?.provider,
    status
  };
}

/**
 * Try all available LLM providers in sequence until one succeeds
 * This provides true multi-provider fallback for course generation
 */
export async function classifyWithAllProviders<T>(
  basePrompt: string,
  schema: z.ZodSchema<T>,
  systemPrompt: string,
  maxAttemptsPerProvider = 2,
): Promise<{ result: T; provider: LLMProvider; attempts: number }> {
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    throw new Error(
      '❌ CRITICAL: No LLM providers configured!\n\n' +
      'Please add at least one API key to your .env.local file:\n' +
      '  • ANTHROPIC_API_KEY=sk-ant-... (Recommended - best for JSON)\n' +
      '  • DEEPSEEK_API_KEY=sk-... (High quality, affordable)\n' +
      '  • MISTRAL_API_KEY=... (European provider, high quality)\n' +
      '  • GEMINI_API_KEY=... (Google Gemini)\n' +
      '  • OPENROUTER_API_KEY=sk-or-... (Multi-provider gateway)\n' +
      '  • GROQ_API_KEY=... (Fast inference)\n' +
      '  • TOGETHER_API_KEY=... (Meta models)\n\n' +
      'Get free API keys from:\n' +
      '  • Anthropic: https://console.anthropic.com/\n' +
      '  • DeepSeek: https://platform.deepseek.com/\n' +
      '  • Mistral: https://console.mistral.ai/\n' +
      '  • Google AI Studio: https://aistudio.google.com/\n' +
      '  • OpenRouter: https://openrouter.ai/\n' +
      '  • Groq: https://console.groq.com/\n' +
      '  • Together AI: https://api.together.xyz/'
    );
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`[LLM Fallback] 🔄 Starting multi-provider fallback with ${availableProviders.length} provider(s)`);
  console.log(`[LLM Fallback] 📋 Provider order: ${availableProviders.join(' → ')}`);
  console.log(`[LLM Fallback] 💡 HINT: If you're getting rate limits, add more API keys to .env.local for redundancy`);
  console.log(`${'═'.repeat(80)}\n`);

  const allErrors: Array<{
    provider: LLMProvider;
    attempt: number;
    error: ReturnType<typeof classifyLLMError>;
  }> = [];

  // If only ONE provider, reduce retry attempts on rate limit to fail faster and show helpful error
  const attemptsPerProvider = availableProviders.length === 1
    ? 1  // Only try once on single provider - fail fast and show error message with instructions
    : maxAttemptsPerProvider;

  let totalAttempts = 0;

  for (const provider of availableProviders) {
    const providerIndex = availableProviders.indexOf(provider) + 1;
    console.log(`\n[LLM Fallback] ${'═'.repeat(60)}`);
    console.log(`[LLM Fallback] 🤖 [${providerIndex}/${availableProviders.length}] Attempting provider: ${provider.toUpperCase()}`);
    console.log(`[LLM Fallback] ${'═'.repeat(60)}`);
    
    // Special handling for Ollama - verify it's actually running
    if (provider === 'ollama') {
      try {
        const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const response = await fetch(`${ollamaUrl}/api/tags`, {
          signal: AbortSignal.timeout(2000)
        });
        if (!response.ok) {
          console.warn(`[LLM Fallback] ⚠️  Ollama not responding, skipping to cloud providers`);
          continue;
        }
        console.log(`[LLM Fallback] ✅ Ollama is running and ready (LOCAL - ZERO COST)`);
      } catch (ollamaError) {
        console.warn(`[LLM Fallback] ⚠️  Ollama not available (${ollamaError instanceof Error ? ollamaError.message : 'unknown error'}), skipping to cloud providers`);
        continue;
      }
    }
    
    let llmClient: LLMClient;
    try {
      llmClient = createLLMClient(provider);
      console.log(`[LLM Fallback] ✅ ${provider} client initialized`);
    } catch (clientError) {
      const errorInfo = classifyLLMError(clientError);
      console.error(`[LLM Fallback] ❌ ${provider} initialization failed:`, errorInfo.message);
      allErrors.push({ provider, attempt: 0, error: errorInfo });
      continue;
    }

    // Add small delay between providers to avoid hammering all APIs at once
    if (availableProviders.indexOf(provider) > 0) {
      const delayBetweenProviders = 100; // 100ms delay between provider attempts
      console.log(`[LLM Fallback] ⏳ Brief delay before ${provider}...`);
      await sleep(delayBetweenProviders);
    }

    for (let attempt = 1; attempt <= attemptsPerProvider; attempt++) {
      const cooldownUntil = providerCooldowns.get(provider) ?? 0;
      const now = Date.now();
      if (cooldownUntil > now) {
        const waitBeforeAttempt = cooldownUntil - now;
        console.log(`[LLM Fallback] ⏳ ${provider} cooling down for ${waitBeforeAttempt}ms before attempt ${attempt}/${attemptsPerProvider}`);
        await sleep(waitBeforeAttempt);
      }

      const prompt =
        attempt === 1
          ? basePrompt
          : `${basePrompt}\n\nREMEMBER: Return valid JSON that matches the provided schema exactly. Do not include prose, markdown fences, or commentary. Attempt ${attempt} of ${attemptsPerProvider}.`;

      try {
        console.log(`[LLM Fallback] 🔄 ${provider} attempt ${attempt}/${attemptsPerProvider}...`);
        totalAttempts += 1;
        const result = await llmClient.classify(prompt, schema, systemPrompt);
        
        console.log(`[LLM Fallback] ✅ SUCCESS with ${provider} on attempt ${attempt}!`);
        console.log(`[LLM Fallback] 📊 Total attempts across all providers: ${totalAttempts}\n`);

        providerCooldowns.delete(provider);
        
        return {
          result,
          provider,
          attempts: totalAttempts
        };
      } catch (error) {
        const errorInfo = classifyLLMError(error);
        console.error(`[LLM Fallback] ❌ ${provider} attempt ${attempt}/${attemptsPerProvider} FAILED`);
        console.error(`[LLM Fallback]    └─ Error Type: ${errorInfo.type.toUpperCase()}`);
        console.error(`[LLM Fallback]    └─ Message: ${errorInfo.message}`);
        console.error(`[LLM Fallback]    └─ Retryable: ${errorInfo.retryable}`);
        if (typeof errorInfo.retryAfterMs === 'number') {
          console.error(`[LLM Fallback]    └─ Retry-After: ${errorInfo.retryAfterMs}ms`);
        }

        allErrors.push({ provider, attempt, error: errorInfo });

        // If it's not retryable (auth/config error), skip remaining attempts for this provider
        if (!errorInfo.retryable) {
          console.warn(`[LLM Fallback] ⚠️  ${provider} has non-retryable error (${errorInfo.type}), MOVING TO NEXT PROVIDER`);
          break;
        }

        // Wait before retry (exponential backoff) - but ONLY if retrying the same provider
        if (attempt < attemptsPerProvider) {
          const waitTime = computeBackoffMs(errorInfo, attempt);
          console.log(`[LLM Fallback] ⏳ Waiting ${waitTime}ms before retry ${attempt + 1}/${attemptsPerProvider}...`);
          if (errorInfo.type === 'rate_limit') {
            const nextAvailable = Math.max(providerCooldowns.get(provider) ?? 0, Date.now() + waitTime);
            providerCooldowns.set(provider, nextAvailable);
            console.log(`[LLM Fallback] 🚦 ${provider} cooling down until ${new Date(nextAvailable).toISOString()}`);
          }
          await sleep(waitTime);
        } else {
          // Exhausted attempts for this provider, move to next
          console.log(`[LLM Fallback] ⏭️  ${provider} exhausted (${attemptsPerProvider} attempt(s)), JUMPING TO NEXT PROVIDER`);
        }
      }
    }

    console.log(`[LLM Fallback] ⏭️  Provider ${providerIndex}/${availableProviders.length} (${provider.toUpperCase()}) FAILED - Moving to next...`);
  }

  // LOOP ENDED - all providers tried
  console.log(`\n[LLM Fallback] ${'═'.repeat(80)}`);
  console.log(`[LLM Fallback] ⚠️  LOOP ENDED - Tried ALL ${availableProviders.length} providers`);
  console.log(`[LLM Fallback] ⚠️  NONE of them succeeded`);
  console.log(`[LLM Fallback] ${'═'.repeat(80)}\n`);

  // All providers failed - generate detailed error report
  console.error(`\n${'═'.repeat(80)}`);
  console.error(`[LLM Fallback] ❌ CRITICAL: ALL ${availableProviders.length} PROVIDER(S) FAILED!`);
  console.error(`[LLM Fallback] 📊 Total attempts: ${totalAttempts}`);
  
  const errorsByType = allErrors.reduce((acc, { error }) => {
    acc[error.type] = (acc[error.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.error(`[LLM Fallback] 📈 Error breakdown:`, errorsByType);
  console.error(`[LLM Fallback] ⚠️  This means ALL configured providers are unreachable or exhausted`);

  // Build detailed error message
  const errorReport = allErrors.map(({ provider, attempt, error }) => {
    const retryHint = typeof error.retryAfterMs === 'number'
      ? ` (retry after ~${Math.round(error.retryAfterMs / 1000)}s)`
      : '';
    return `  • ${provider} (attempt ${attempt}): ${error.type.toUpperCase()} - ${error.message}${retryHint}`;
  }).join('\n');

  const actionableAdvice = generateActionableAdvice(allErrors);

  throw new Error(
  `❌ Course generation failed - all ${availableProviders.length} AI providers exhausted after ${totalAttempts} attempts.\n\n` +
    `📋 FAILURE DETAILS:\n${errorReport}\n\n` +
    `💡 RECOMMENDED ACTIONS:\n${actionableAdvice}\n\n` +
    `🔧 TROUBLESHOOTING:\n` +
    `  1. Check your API keys are correctly configured in .env.local\n` +
    `  2. Verify you haven't exceeded free tier limits\n` +
    `  3. Try again in a few minutes (rate limits reset)\n` +
    `  4. Add more API keys for better redundancy\n\n` +
    `Available providers: ${availableProviders.join(', ')}`
  );
}

function generateActionableAdvice(
  errors: Array<{ provider: LLMProvider; attempt: number; error: ReturnType<typeof classifyLLMError> }>
): string {
  const errorTypes = new Set(errors.map(e => e.error.type));
  const advice: string[] = [];
  const providers = Array.from(new Set(errors.map(e => e.provider)));

  if (errorTypes.has('rate_limit')) {
    advice.push('  ⏰ RATE LIMIT: You\'ve hit API usage limits. Your options:');
    advice.push('     1. Wait 5-10 minutes (free tier limits reset automatically)');
    advice.push('     2. Add more API provider keys to .env.local for automatic fallback');
    advice.push('     3. Download Ollama for unlimited free local generation (zero cost)');
  }

  if (errorTypes.has('auth')) {
    advice.push('  🔑 AUTH ERROR: Check your API keys in .env.local. Make sure they\'re valid and properly formatted.');
  }

  if (errorTypes.has('timeout')) {
    advice.push('  ⏱️  TIMEOUT: Requests are taking too long. Try a simpler course topic or shorter duration.');
  }

  if (errorTypes.has('network')) {
    advice.push('  🌐 NETWORK: Cannot reach AI providers. Check your internet connection or firewall settings.');
  }

  if (errorTypes.has('validation')) {
    advice.push('  ⚠️  VALIDATION: AI is returning malformed data. This is usually temporary - try again.');
  }

  if (errorTypes.has('config')) {
    advice.push('  ⚙️  CONFIG: Missing configuration. Add API keys to .env.local (see .env.example).');
  }

  if (advice.length === 0) {
    advice.push('  ❓ UNKNOWN: Unexpected error. Check server logs and try again in a few minutes.');
  }

  // Add provider-specific advice
  if (providers.length === 1) {
    const provider = providers[0];
    advice.push(`\n  💡 CRITICAL HINT: Only ${provider.toUpperCase()} is configured!`);
    advice.push(`     👉 Add more API keys to .env.local for automatic redundancy:`);
    advice.push(`        - ANTHROPIC_API_KEY (recommended - best for JSON)`);
    advice.push(`        - GROQ_API_KEY (fast inference)`);
    advice.push(`        - GEMINI_API_KEY (good free tier)`);
    advice.push(`        - DEEPSEEK_API_KEY (high quality, affordable)`);
    advice.push(`     👉 Or install Ollama for unlimited zero-cost generation`);
    advice.push(`        - Download: https://ollama.ai`);
    advice.push(`        - Command: ollama pull neural-chat:latest`);
  }

  return advice.join('\n');
}
