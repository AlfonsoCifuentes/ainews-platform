/**
 * LLM Retry Orchestration & Prompt Caching
 * Phase 5.1 - Category E: LLM/Agents
 * 
 * Features:
 * - Cascade retry: GROQ → OpenRouter → Gemini
 * - Prompt caching for repeated system prompts
 * - Exponential backoff with jitter
 * - Provider failover tracking
 */

import { LLMClient, type LLMResponse, type GenerateOptions } from './llm-client';

// ============================================================================
// TYPES
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  enableJitter: boolean;
}

export interface PromptCacheEntry {
  systemPrompt: string;
  timestamp: number;
  hits: number;
}

export interface ProviderConfig {
  name: 'groq' | 'openrouter' | 'gemini';
  apiKey: string;
  baseUrl: string;
  model: string;
  priority: number;
  enabled: boolean;
}

export interface GenerateWithRetryOptions extends Partial<GenerateOptions> {
  systemPrompt?: string;
  userPrompt: string;
  enableCache?: boolean;
  retryConfig?: Partial<RetryConfig>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  enableJitter: true,
};

const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 50;

// ============================================================================
// PROMPT CACHE (In-Memory)
// ============================================================================

class PromptCache {
  private cache = new Map<string, PromptCacheEntry>();

  set(key: string, systemPrompt: string): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      systemPrompt,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    // Increment hit counter
    entry.hits++;
    return entry.systemPrompt;
  }

  getStats(): { size: number; totalHits: number } {
    const totalHits = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.hits,
      0
    );
    return { size: this.cache.size, totalHits };
  }

  clear(): void {
    this.cache.clear();
  }
}

const promptCache = new PromptCache();

// ============================================================================
// PROVIDER CONFIGURATION
// ============================================================================

function getProviderConfigs(): ProviderConfig[] {
  const configs: ProviderConfig[] = [];

  // Priority 1: GROQ (fastest, free tier)
  if (process.env.GROQ_API_KEY) {
    configs.push({
      name: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.1-70b-versatile',
      priority: 1,
      enabled: true,
    });
  }

  // Priority 2: OpenRouter (multiple models, generous free tier)
  if (process.env.OPENROUTER_API_KEY) {
    configs.push({
      name: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'google/gemini-2.0-flash-exp:free',
      priority: 2,
      enabled: true,
    });
  }

  // Priority 3: Gemini (direct API, very generous free tier)
  if (process.env.GEMINI_API_KEY) {
    configs.push({
      name: 'gemini',
      apiKey: process.env.GEMINI_API_KEY,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.0-flash-exp',
      priority: 3,
      enabled: true,
    });
  }

  return configs.sort((a, b) => a.priority - b.priority);
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  const delay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs
  );

  if (config.enableJitter) {
    // Add random jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.max(0, delay + jitter);
  }

  return delay;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN ORCHESTRATION FUNCTION
// ============================================================================

/**
 * Generate LLM response with automatic retry cascade and prompt caching
 * 
 * @example
 * ```typescript
 * const response = await generateWithRetry({
 *   systemPrompt: 'You are a helpful AI assistant.',
 *   userPrompt: 'Explain quantum computing in simple terms.',
 *   enableCache: true,
 *   temperature: 0.7,
 * });
 * ```
 */
export async function generateWithRetry(
  options: GenerateWithRetryOptions
): Promise<LLMResponse & { provider: string; attempts: number }> {
  const {
    systemPrompt,
    userPrompt,
    enableCache = true,
    retryConfig: customRetryConfig,
    ...generateOptions
  } = options;

  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...customRetryConfig };
  const providers = getProviderConfigs();

  if (providers.length === 0) {
    throw new Error('No LLM providers configured. Please set GROQ_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY.');
  }

  // Build final prompt with caching
  let finalPrompt = userPrompt;
  if (systemPrompt) {
    const cacheKey = `sys:${systemPrompt.substring(0, 100)}`;
    
    if (enableCache) {
      const cached = promptCache.get(cacheKey);
      if (cached) {
        // Cache hit - use cached system prompt
        finalPrompt = `${cached}\n\n${userPrompt}`;
      } else {
        // Cache miss - store and use
        promptCache.set(cacheKey, systemPrompt);
        finalPrompt = `${systemPrompt}\n\n${userPrompt}`;
      }
    } else {
      finalPrompt = `${systemPrompt}\n\n${userPrompt}`;
    }
  }

  let lastError: Error | null = null;
  let totalAttempts = 0;

  // Try each provider in priority order
  for (const providerConfig of providers) {
    if (!providerConfig.enabled) continue;

    const client = new LLMClient(
      providerConfig.apiKey,
      providerConfig.baseUrl,
      providerConfig.model,
      providerConfig.name
    );

    // Retry with exponential backoff for this provider
    for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
      totalAttempts++;

      try {
        const response = await client.generate(finalPrompt, generateOptions);
        
        // Success! Return with metadata
        return {
          ...response,
          provider: providerConfig.name,
          attempts: totalAttempts,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on the last attempt or if it's a validation error
        if (
          attempt === retryConfig.maxRetries - 1 ||
          lastError.message.includes('validation') ||
          lastError.message.includes('400')
        ) {
          break;
        }

        // Wait before retry
        const delay = calculateDelay(attempt, retryConfig);
        await sleep(delay);
      }
    }

    // This provider failed, move to next one
    console.warn(`Provider ${providerConfig.name} failed after ${retryConfig.maxRetries} attempts. Trying next provider...`);
  }

  // All providers exhausted
  throw new Error(
    `All LLM providers failed after ${totalAttempts} attempts. Last error: ${lastError?.message}`
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get prompt cache statistics
 */
export function getCacheStats(): { size: number; totalHits: number } {
  return promptCache.getStats();
}

/**
 * Clear prompt cache (useful for testing)
 */
export function clearCache(): void {
  promptCache.clear();
}

/**
 * Test provider connectivity
 */
export async function testProviders(): Promise<Record<string, boolean>> {
  const providers = getProviderConfigs();
  const results: Record<string, boolean> = {};

  for (const config of providers) {
    try {
      const client = new LLMClient(
        config.apiKey,
        config.baseUrl,
        config.model,
        config.name
      );

      await client.generate('Say "OK" if you can read this.', {
        temperature: 0,
        maxTokens: 10,
      });

      results[config.name] = true;
    } catch {
      results[config.name] = false;
    }
  }

  return results;
}
