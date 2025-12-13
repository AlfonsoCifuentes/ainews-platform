/**
 * MODEL STRATEGY - Intelligent model selection for different tasks
 * 
 * ⚠️ IMPORTANT: This file uses model definitions from model-versions.ts
 * Always keep model-versions.ts up-to-date with the latest AI models.
 * 
 * 📅 LATEST MODELS (as of 2025):
 * - OpenAI: GPT-5.1, GPT-5 Pro, o3, o4-mini
 * - Anthropic: Claude Opus 4.5, Claude Sonnet 4.5, Claude Haiku 4.5
 * - Google: Gemini 3 Pro, Gemini 2.5 Flash
 * 
 * Based on model strengths:
 * 
 * Fallback chain: Groq → Gemini → Anthropic → OpenAI
 */

import { 
  OPENAI_MODELS, 
  GEMINI_MODELS, 
  CLAUDE_MODELS, 
  GROQ_MODELS, 
  OPENROUTER_MODELS 
} from './model-versions';

export type TaskType = 
  | 'outline_planning'      // Chapter outline, curriculum design
  | 'exercise_generation'   // Exercises, quizzes, problems
  | 'reasoning_validation'  // Verify math, logic, proofs
  | 'visual_planning'       // Decide what images/diagrams to generate (image-only)
  | 'content_generation'    // Main textbook prose
  | 'case_study'           // Case study narratives
  | 'exam_generation'      // Exam questions
  | 'translation'          // i18n translation
  | 'code_generation'      // Code examples
  | 'quick_classification' // Fast classification tasks
  | 'general';             // Fallback

type ModelProfile = 'latest' | 'cost-balanced';

function getActiveModelProfile(): ModelProfile {
  const raw = (process.env.AI_MODEL_PROFILE || '').trim().toLowerCase();
  if (raw === 'cost-balanced' || raw === 'cost_balanced' || raw === 'costbalanced') return 'cost-balanced';
  return 'latest';
}

export interface ModelConfig {
  provider: 'groq' | 'openrouter' | 'gemini' | 'anthropic' | 'openai';
  model: string;
  description: string;
  maxTokens?: number;
  temperature?: number;
  contextWindow?: number;
}

// Model definitions with their characteristics
// ⚠️ Using latest versions from model-versions.ts
const MODELS = {
  // === CLOUD MODELS (LATEST VERSIONS 2025) ===
  
  groq_llama70b: {
    provider: 'groq' as const,
    model: GROQ_MODELS.LLAMA_3_3_70B,
    description: 'Groq Llama 3.3 70B - Ultra fast cloud inference',
    maxTokens: 8000,
    temperature: 0.7,
    contextWindow: 131072
  },
  
  // Gemini 2.5 Flash - Best price-performance (Gemini 3 Pro reserved for premium)
  gemini_flash: {
    provider: 'gemini' as const,
    model: GEMINI_MODELS.GEMINI_2_5_FLASH,
    description: 'Gemini 2.5 Flash - Best price-performance, fast multimodal',
    maxTokens: 8000,
    temperature: 0.7,
    contextWindow: 1000000
  },
  
  // Gemini 3 Pro - Most intelligent Gemini model
  gemini_pro: {
    provider: 'gemini' as const,
    model: GEMINI_MODELS.GEMINI_3_PRO,
    description: 'Gemini 3 Pro - Most intelligent, multimodal understanding',
    maxTokens: 8000,
    temperature: 0.7,
    contextWindow: 2000000
  },
  
  // Claude Sonnet 4.5 - Best for complex agents and coding
  claude_sonnet: {
    provider: 'anthropic' as const,
    model: CLAUDE_MODELS.CLAUDE_SONNET_4_5,
    description: 'Claude Sonnet 4.5 - Best for agents, coding, complex tasks',
    maxTokens: 8000,
    temperature: 0.7,
    contextWindow: 200000
  },
  
  // Claude Haiku 4.5 - Fast near-frontier performance
  claude_haiku: {
    provider: 'anthropic' as const,
    model: CLAUDE_MODELS.CLAUDE_HAIKU_4_5,
    description: 'Claude Haiku 4.5 - Fastest near-frontier performance',
    maxTokens: 8000,
    temperature: 0.7,
    contextWindow: 200000
  },
  
  // GPT-5.1 - Best for coding and agentic tasks
  gpt5: {
    provider: 'openai' as const,
    model: OPENAI_MODELS.GPT_5_1,
    description: 'GPT-5.1 - Best for coding and agentic tasks',
    maxTokens: 8000,
    temperature: 0.7,
    contextWindow: 128000
  },
  
  // GPT-5 Nano - Fast and cheap
  gpt5_nano: {
    provider: 'openai' as const,
    model: OPENAI_MODELS.GPT_5_NANO,
    description: 'GPT-5 Nano - Fastest, cheapest OpenAI model',
    maxTokens: 4000,
    temperature: 0.7,
    contextWindow: 128000
  },
  
  // OpenRouter - Free tier access
  openrouter_llama70b: {
    provider: 'openrouter' as const,
    model: OPENROUTER_MODELS.LLAMA_3_3_70B_FREE,
    description: 'OpenRouter Llama 3.3 70B - Free tier cloud inference',
    maxTokens: 8000,
    temperature: 0.7,
    contextWindow: 131072
  },
  
  // Legacy aliases (for backward compatibility)
  gpt4o: {
    provider: 'openai' as const,
    model: OPENAI_MODELS.GPT_5_1, // Upgraded from GPT-4o
    description: 'GPT-5.1 - Strong all-around performer (upgraded from GPT-4o)',
    maxTokens: 4000,
    temperature: 0.7,
    contextWindow: 128000
  }
} satisfies Record<string, ModelConfig>;

// Task-specific model preferences (ordered by priority)
// DeepSeek R1 70B = Reasoning tasks (planning, exercises, validation)
// Qwen3 30B = Prose tasks (content, case studies, translations)
// ⚠️ Cloud fallbacks use LATEST versions (2025)
const TASK_MODEL_PREFERENCES: Record<TaskType, (keyof typeof MODELS)[]> = {
  outline_planning: [
    'claude_sonnet',
    'gemini_pro',
    'gpt5',
    'groq_llama70b',
    'gemini_flash',
    'openrouter_llama70b'
  ],

  exercise_generation: [
    'claude_sonnet',
    'gpt5',
    'gemini_pro',
    'groq_llama70b',
    'gemini_flash',
    'openrouter_llama70b'
  ],

  reasoning_validation: [
    'claude_sonnet',
    'gemini_pro',
    'gpt5'
  ],

  visual_planning: [
    'claude_sonnet',
    'gemini_pro',
    'gpt5',
    'gemini_flash'
  ],

  content_generation: [
    'claude_sonnet',
    'gemini_pro',
    'gpt5',
    'groq_llama70b',
    'gemini_flash'
  ],

  case_study: [
    'claude_sonnet',
    'gpt5',
    'gemini_pro',
    'groq_llama70b'
  ],

  exam_generation: [
    'claude_sonnet',
    'gpt5',
    'gemini_pro',
    'groq_llama70b'
  ],

  translation: [
    'gemini_pro',
    'gemini_flash',
    'claude_sonnet',
    'gpt5_nano',
    'gpt5'
  ],

  code_generation: [
    'claude_sonnet',
    'gpt5',
    'groq_llama70b',
    'gemini_pro'
  ],

  // Fast models for quick classification
  quick_classification: [
    'gemini_flash',
    'claude_haiku',
    'groq_llama70b',
    'openrouter_llama70b',
    'gpt5_nano'
  ],

  // General fallback chain
  general: [
    'groq_llama70b',
    'gemini_flash',       // Gemini 2.5 Flash
    'claude_sonnet',      // Claude Sonnet 4.5
    'gpt5',               // GPT-5.1
    'openrouter_llama70b'
  ]
};

// Cost-balanced profile preferences
// Intent: prefer cheaper/faster cloud models while keeping quality acceptable.
const TASK_MODEL_PREFERENCES_COST_BALANCED: Record<TaskType, (keyof typeof MODELS)[]> = {
  outline_planning: ['gemini_flash', 'groq_llama70b', 'claude_haiku', 'openrouter_llama70b', 'gpt5_nano'],
  exercise_generation: ['groq_llama70b', 'gemini_flash', 'claude_haiku', 'openrouter_llama70b', 'gpt5_nano'],
  reasoning_validation: ['claude_sonnet', 'gemini_pro', 'gpt5'],
  visual_planning: ['gemini_flash', 'claude_haiku', 'groq_llama70b', 'gpt5_nano'],
  content_generation: ['claude_sonnet', 'gemini_pro', 'groq_llama70b', 'gpt5'],
  case_study: ['claude_sonnet', 'groq_llama70b', 'gemini_pro', 'gpt5'],
  exam_generation: ['claude_sonnet', 'gemini_pro', 'gpt5'],
  translation: ['gemini_flash', 'gemini_pro', 'claude_sonnet', 'gpt5_nano'],
  code_generation: ['claude_sonnet', 'gpt5', 'groq_llama70b'],
  quick_classification: ['gemini_flash', 'groq_llama70b', 'claude_haiku', 'openrouter_llama70b', 'gpt5_nano'],
  general: ['gemini_flash', 'groq_llama70b', 'claude_haiku', 'openrouter_llama70b', 'gpt5_nano'],
};

// ============================================================================
// MODEL AVAILABILITY DETECTION
// ============================================================================

interface AvailableModels {
  hasGroq: boolean;
  hasGemini: boolean;
  hasAnthropic: boolean;
  hasOpenAI: boolean;
  hasOpenRouter: boolean;
}

let cachedAvailability: AvailableModels | null = null;
let lastAvailabilityCheck = 0;
const AVAILABILITY_CACHE_MS = 60000; // 1 minute

async function checkModelAvailability(): Promise<AvailableModels> {
  // Return cached if fresh
  if (cachedAvailability && (Date.now() - lastAvailabilityCheck) < AVAILABILITY_CACHE_MS) {
    return cachedAvailability;
  }

  cachedAvailability = {
    hasGroq: !!process.env.GROQ_API_KEY,
    hasGemini: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY),
    hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasOpenRouter: !!process.env.OPENROUTER_API_KEY
  };
  lastAvailabilityCheck = Date.now();

  console.log('[ModelStrategy] Available models:', {
    cloud: Object.entries(cachedAvailability)
      .filter(([k, v]) => k.startsWith('has') && v)
      .map(([k]) => k.replace('has', ''))
  });

  return cachedAvailability;
}

function isModelAvailable(modelKey: keyof typeof MODELS, availability: AvailableModels): boolean {
  const model = MODELS[modelKey];
  
  switch (model.provider) {
    case 'groq':
      return availability.hasGroq;
    case 'gemini':
      return availability.hasGemini;
    case 'anthropic':
      return availability.hasAnthropic;
    case 'openai':
      return availability.hasOpenAI;
    case 'openrouter':
      return availability.hasOpenRouter;
    default:
      return false;
  }
}

// ============================================================================
// MODEL SELECTION
// ============================================================================

export interface SelectedModel extends ModelConfig {
  key: string;
  fallbackChain: ModelConfig[];
}

/**
 * Select the best available model for a specific task
 */
export async function selectModelForTask(task: TaskType): Promise<SelectedModel> {
  const availability = await checkModelAvailability();
  const profile = getActiveModelProfile();
  const preferences = (profile === 'cost-balanced')
    ? TASK_MODEL_PREFERENCES_COST_BALANCED[task]
    : TASK_MODEL_PREFERENCES[task];
  
  // Find first available model from preferences
  for (const modelKey of preferences) {
    if (isModelAvailable(modelKey, availability)) {
      const config = MODELS[modelKey];
      
      // Build fallback chain from remaining preferences
      const fallbackChain: ModelConfig[] = [];
      for (let i = preferences.indexOf(modelKey) + 1; i < preferences.length; i++) {
        const fallbackKey = preferences[i];
        if (isModelAvailable(fallbackKey, availability)) {
          fallbackChain.push(MODELS[fallbackKey]);
        }
      }
      
      console.log(`[ModelStrategy] Profile "${profile}" task "${task}" → ${modelKey} (${config.description})`);
      if (fallbackChain.length > 0) {
        console.log(`[ModelStrategy] Fallback chain: ${fallbackChain.map(m => m.model).join(' → ')}`);
      }
      
      return {
        key: modelKey,
        ...config,
        fallbackChain
      };
    }
  }
  
  // No preferred model available, try any available model
  console.warn(`[ModelStrategy] No preferred model for "${task}", using any available`);
  
  // Try all cloud providers as last resort
  if (availability.hasGroq) {
    return { key: 'groq_llama70b', ...MODELS.groq_llama70b, fallbackChain: [] };
  }
  if (availability.hasGemini) {
    return { key: 'gemini_flash', ...MODELS.gemini_flash, fallbackChain: [] };
  }
  if (availability.hasAnthropic) {
    return { key: 'claude_sonnet', ...MODELS.claude_sonnet, fallbackChain: [] };
  }
  if (availability.hasOpenAI) {
    return { key: 'gpt5', ...MODELS.gpt5, fallbackChain: [] };
  }
  
  throw new Error(`No models available for task "${task}". Please configure at least one cloud API key.`);
}

// ============================================================================
// MODEL EXECUTION
// ============================================================================

export interface GenerationResult {
  content: string;
  model: string;
  provider: string;
  tokensUsed?: number;
  durationMs: number;
}

/**
 * Execute a prompt with the selected model, with automatic fallback
 */
export async function executeWithModel(
  selectedModel: SelectedModel,
  prompt: string,
  systemPrompt?: string
): Promise<GenerationResult> {
  const startTime = Date.now();
  const allModels = [selectedModel, ...selectedModel.fallbackChain];
  
  for (const model of allModels) {
    try {
      console.log(`[ModelStrategy] Executing with ${model.model}...`);
      const content = await callModel(model, prompt, systemPrompt);
      
      return {
        content,
        model: model.model,
        provider: model.provider,
        durationMs: Date.now() - startTime
      };
    } catch (error) {
      console.warn(`[ModelStrategy] ${model.model} failed:`, error instanceof Error ? error.message : 'Unknown error');
      if (model === allModels[allModels.length - 1]) {
        throw error; // Last model in chain, propagate error
      }
      // Try next model in fallback chain
    }
  }
  
  throw new Error('All models in fallback chain failed');
}

async function callModel(
  config: ModelConfig,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  switch (config.provider) {
    case 'groq':
      return callGroq(config, prompt, systemPrompt);
    case 'gemini':
      return callGemini(config, prompt, systemPrompt);
    case 'anthropic':
      return callAnthropic(config, prompt, systemPrompt);
    case 'openai':
      return callOpenAI(config, prompt, systemPrompt);
    case 'openrouter':
      return callOpenRouter(config, prompt, systemPrompt);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

async function callGroq(config: ModelConfig, prompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');
  
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4000
    })
  });
  
  if (!response.ok) throw new Error(`Groq error: ${response.status}`);
  const data = await response.json() as { choices: Array<{ message?: { content: string } }> };
  return data.choices[0]?.message?.content || '';
}

async function callGemini(config: ModelConfig, prompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens ?? 4000
      }
    })
  });
  
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callAnthropic(config: ModelConfig, prompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens ?? 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  if (!response.ok) throw new Error(`Anthropic error: ${response.status}`);
  const data = await response.json() as { content?: Array<{ text: string }> };
  return data.content?.[0]?.text || '';
}

async function callOpenAI(config: ModelConfig, prompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4000
    })
  });
  
  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  const data = await response.json() as { choices: Array<{ message?: { content: string } }> };
  return data.choices[0]?.message?.content || '';
}

async function callOpenRouter(config: ModelConfig, prompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4000
    })
  });
  
  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json() as { choices: Array<{ message?: { content: string } }> };
  return data.choices[0]?.message?.content || '';
}

// ============================================================================
// SPECIALIZED FUNCTIONS
// ============================================================================

/**
 * Clean DeepSeek's chain-of-thought output for polished text
 * DeepSeek often includes <think>...</think> blocks that need removal
 */
export function cleanDeepSeekOutput(text: string): string {
  // Remove <think>...</think> blocks (chain of thought)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  
  // Remove common reasoning artifacts
  cleaned = cleaned.replace(/^(Let me think|Let's analyze|First,? I'll|Okay,? so)\b[^.]*\./gmi, '');
  cleaned = cleaned.replace(/^(Step \d+:|First:|Second:|Third:|Finally:)/gmi, '');
  
  // Remove excessive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace
  return cleaned.trim();
}

/**
 * Post-process Qwen3 output for consistency
 * Qwen3 is usually clean, but may include thinking tokens
 */
export function cleanQwenOutput(text: string): string {
  // Qwen3 may include <think> blocks with /think or /no_think modes
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  
  // Remove any thinking prefixes
  cleaned = cleaned.replace(/^(Thinking:|Let me think:?)\s*/gmi, '');
  
  // Clean up excessive newlines
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');
  
  return cleaned.trim();
}

/**
 * Execute task with appropriate model and post-processing
 */
export async function executeTask(
  task: TaskType,
  prompt: string,
  systemPrompt?: string
): Promise<GenerationResult> {
  const model = await selectModelForTask(task);
  const result = await executeWithModel(model, prompt, systemPrompt);
  
  // Apply model-specific post-processing
  if (model.model.includes('deepseek')) {
    result.content = cleanDeepSeekOutput(result.content);
  } else if (model.model.includes('qwen')) {
    result.content = cleanQwenOutput(result.content);
  }
  
  return result;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { MODELS, TASK_MODEL_PREFERENCES };
