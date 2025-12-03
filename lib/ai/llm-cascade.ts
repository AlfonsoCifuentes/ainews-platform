/**
 * LLM Cascade - Simple wrapper for multi-provider LLM calls
 * Uses the unified LLM client with cascade fallback
 */

import { UnifiedLLMClient } from './unified-llm-client';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CascadeOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  task?: string;
}

interface CascadeResult {
  success: boolean;
  content: string;
  error?: string;
  model?: string;
  provider?: string;
}

/**
 * Call LLM with automatic cascade fallback through multiple providers
 * Uses: Groq → Gemini → Mistral → DeepSeek → OpenAI → Claude
 */
export async function callLLMWithCascade(options: CascadeOptions): Promise<CascadeResult> {
  const { messages, maxTokens = 1000, temperature = 0.7 } = options;

  // Extract system prompt and user message from messages array
  const systemMessage = messages.find(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');
  
  // Build prompt from conversation history
  const prompt = conversationMessages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const client = new UnifiedLLMClient();

  // Try first combination: Groq → Gemini → Mistral
  try {
    const result = await client.generateWithFallback({
      prompt,
      systemPrompt: systemMessage?.content,
      maxTokens,
      temperature,
    }, 'groq_gemini_mistral');

    if (result.success && result.text) {
      return {
        success: true,
        content: result.text,
        model: result.model,
        provider: result.provider,
      };
    }
  } catch (e) {
    console.warn('[LLM Cascade] First combination failed:', e);
  }

  // Try second combination: DeepSeek → OpenAI → Claude
  try {
    const result = await client.generateWithFallback({
      prompt,
      systemPrompt: systemMessage?.content,
      maxTokens,
      temperature,
    }, 'deepseek_openai_claude');

    if (result.success && result.text) {
      return {
        success: true,
        content: result.text,
        model: result.model,
        provider: result.provider,
      };
    }

    return {
      success: false,
      content: '',
      error: result.error || 'All providers failed',
    };
  } catch (error) {
    console.error('[LLM Cascade] All providers failed:', error);
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Simple text generation with cascade fallback
 */
export async function generateText(
  prompt: string,
  options?: { systemPrompt?: string; maxTokens?: number; temperature?: number }
): Promise<CascadeResult> {
  const messages: ChatMessage[] = [];
  
  if (options?.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  return callLLMWithCascade({
    messages,
    maxTokens: options?.maxTokens,
    temperature: options?.temperature,
  });
}
