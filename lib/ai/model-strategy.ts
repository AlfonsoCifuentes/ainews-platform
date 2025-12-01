/**
 * MODEL STRATEGY - Intelligent model selection for different tasks
 * 
 * Based on model strengths:
 * 
 * 🧠 DeepSeek-R1 70B:
 *   - Exceptional step-by-step reasoning and chain-of-thought
 *   - Best for math problems, proofs, logical analysis, exercise design
 *   - Ideal for curriculum planning, exercise banks, validation
 *   - Outputs verbose "thinking" blocks (cleaned automatically)
 *   - USE FOR: Planning, exercises, validation, reasoning-heavy tasks
 * 
 * 📘 Qwen3 30B:
 *   - Excellent balance of quality and speed
 *   - Strong coherence in long-form prose content
 *   - Supports Spanish and 100+ languages natively
 *   - Good at following complex instructions
 *   - USE FOR: Main textbook content, prose generation, translations
 * 
 * Fallback chain: Groq → Gemini → Anthropic → OpenAI
 */

export type TaskType = 
  | 'outline_planning'      // Chapter outline, curriculum design
  | 'exercise_generation'   // Exercises, quizzes, problems
  | 'reasoning_validation'  // Verify math, logic, proofs
  | 'content_generation'    // Main textbook prose
  | 'case_study'           // Case study narratives
  | 'exam_generation'      // Exam questions
  | 'translation'          // i18n translation
  | 'code_generation'      // Code examples
  | 'quick_classification' // Fast classification tasks
  | 'general';             // Fallback

export interface ModelConfig {
  provider: 'ollama' | 'groq' | 'openrouter' | 'gemini' | 'anthropic' | 'openai';
  model: string;
  description: string;
  maxTokens?: number;
  temperature?: number;
  contextWindow?: number;
}

// Model definitions with their characteristics
const MODELS = {
  // === OLLAMA LOCAL MODELS (PRIMARY) ===
  
  // 🧠 DeepSeek R1 70B - REASONING POWERHOUSE
  // Best for: Planning, exercises, validation, math, proofs
  deepseek_r1_70b: {
    provider: 'ollama' as const,
    model: 'deepseek-r1:70b',
    description: 'DeepSeek R1 70B - Exceptional reasoning, step-by-step analysis, exercise design',
    maxTokens: 8000,
    temperature: 0.3, // Lower temp for precise reasoning
    contextWindow: 65536
  },
  
  // 📘 Qwen3 30B - PROSE GENERATION WORKHORSE
  // Best for: Textbook content, case studies, translations
  qwen3_30b: {
    provider: 'ollama' as const,
    model: 'qwen3:30b',
    description: 'Qwen3 30B - Excellent prose quality, 100+ languages, fast generation',
    maxTokens: 8000,
    temperature: 0.7,
    contextWindow: 40960
  },
  
  // === OLLAMA FALLBACK MODELS ===
  qwen2_5_14b: {
    provider: 'ollama' as const,
    model: 'qwen2.5:14b',
    description: 'Qwen2.5 14B - Faster fallback, good quality',
    maxTokens: 4000,
    temperature: 0.7,
    contextWindow: 131072
  },
  llama3_1_8b: {
    provider: 'ollama' as const,
    model: 'llama3.1:8b',
    description: 'Llama 3.1 8B - Fast, lightweight fallback',
    maxTokens: 4000,
    temperature: 0.7,
    contextWindow: 131072
  },

  // === CLOUD MODELS ===
  groq_llama70b: {
    provider: 'groq' as const,
    model: 'llama-3.3-70b-versatile',
    description: 'Groq Llama 3.3 70B - Ultra fast cloud inference',
    maxTokens: 8000,
    temperature: 0.7,
    contextWindow: 131072
  },
  gemini_flash: {
    provider: 'gemini' as const,
    model: 'gemini-1.5-flash',
    description: 'Gemini 1.5 Flash - Fast, multimodal capable',
    maxTokens: 8000,
    temperature: 0.7,
    contextWindow: 1000000
  },
  gemini_pro: {
    provider: 'gemini' as const,
    model: 'gemini-1.5-pro',
    description: 'Gemini 1.5 Pro - High quality, long context',
    maxTokens: 8000,
    temperature: 0.7,
    contextWindow: 2000000
  },
  claude_sonnet: {
    provider: 'anthropic' as const,
    model: 'claude-3-5-sonnet-20241022',
    description: 'Claude 3.5 Sonnet - Excellent writing quality',
    maxTokens: 8000,
    temperature: 0.7,
    contextWindow: 200000
  },
  gpt4o: {
    provider: 'openai' as const,
    model: 'gpt-4o',
    description: 'GPT-4o - Strong all-around performer',
    maxTokens: 4000,
    temperature: 0.7,
    contextWindow: 128000
  },
  // OpenRouter model for free tier access
  openrouter_llama70b: {
    provider: 'openrouter' as const,
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    description: 'OpenRouter Llama 3.3 70B - Free tier cloud inference',
    maxTokens: 8000,
    temperature: 0.7,
    contextWindow: 131072
  }
} satisfies Record<string, ModelConfig>;

// Task-specific model preferences (ordered by priority)
// DeepSeek R1 70B = Reasoning tasks (planning, exercises, validation)
// Qwen3 30B = Prose tasks (content, case studies, translations)
const TASK_MODEL_PREFERENCES: Record<TaskType, (keyof typeof MODELS)[]> = {
  // 🧠 DeepSeek excels at structured planning
  outline_planning: [
    'deepseek_r1_70b',    // Best for structured planning & curriculum design
    'qwen3_30b',          // Fallback with good reasoning
    'groq_llama70b',      // Cloud fallback
    'gemini_pro',
    'claude_sonnet',
    'gpt4o'
  ],

  // 🧠 DeepSeek excellent for exercises and problems
  exercise_generation: [
    'deepseek_r1_70b',    // Best for rigorous problem generation
    'qwen3_30b',          // Good at math/code exercises
    'groq_llama70b',
    'claude_sonnet',
    'gpt4o'
  ],

  // 🧠 DeepSeek for validation and verification
  reasoning_validation: [
    'deepseek_r1_70b',    // Best at reasoning & validation
    'claude_sonnet',      // Good at analysis
    'gpt4o'
  ],

  // 📘 Qwen3 for polished prose content
  content_generation: [
    'qwen3_30b',          // Best for long-form prose, clean output
    'qwen2_5_14b',        // Faster fallback
    'claude_sonnet',      // Excellent writing
    'groq_llama70b',
    'gemini_pro',
    'gpt4o'
  ],

  // 📘 Qwen3 for narrative case studies
  case_study: [
    'qwen3_30b',          // Good narrative, clean prose
    'claude_sonnet',      // Excellent storytelling
    'groq_llama70b',
    'gpt4o'
  ],

  // 🧠 DeepSeek for rigorous exam questions
  exam_generation: [
    'deepseek_r1_70b',    // Rigorous question design
    'qwen3_30b',          // Good for varied question types
    'claude_sonnet',
    'gpt4o'
  ],

  // 📘 Qwen3 excellent for multilingual (100+ languages)
  translation: [
    'qwen3_30b',          // 100+ languages, excellent Spanish
    'gemini_pro',         // Good multilingual
    'claude_sonnet',
    'gpt4o'
  ],

  // 🧠 DeepSeek for code logic, Qwen3 for code style
  code_generation: [
    'deepseek_r1_70b',    // Strong code logic
    'qwen3_30b',          // Clean code output
    'claude_sonnet',
    'gpt4o'
  ],

  // Fast models for quick classification
  quick_classification: [
    'qwen2_5_14b',        // Fast, accurate
    'llama3_1_8b',        // Very fast
    'groq_llama70b',      // Cloud fast
    'gemini_flash'
  ],

  // General fallback chain
  general: [
    'qwen3_30b',          // Primary general purpose
    'deepseek_r1_70b',    // Secondary
    'qwen2_5_14b',        // Fast fallback
    'groq_llama70b',
    'gemini_flash',
    'claude_sonnet',
    'gpt4o'
  ]
};

// ============================================================================
// MODEL AVAILABILITY DETECTION
// ============================================================================

interface AvailableModels {
  ollama: string[];
  hasGroq: boolean;
  hasGemini: boolean;
  hasAnthropic: boolean;
  hasOpenAI: boolean;
  hasOpenRouter: boolean;
}

let cachedAvailability: AvailableModels | null = null;
let lastAvailabilityCheck = 0;
const AVAILABILITY_CACHE_MS = 60000; // 1 minute

async function checkOllamaModels(): Promise<string[]> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return [];
    const data = await response.json() as { models?: Array<{ name: string }> };
    return data.models?.map(m => m.name) || [];
  } catch {
    return [];
  }
}

async function checkModelAvailability(): Promise<AvailableModels> {
  // Return cached if fresh
  if (cachedAvailability && (Date.now() - lastAvailabilityCheck) < AVAILABILITY_CACHE_MS) {
    return cachedAvailability;
  }

  const ollamaModels = await checkOllamaModels();
  
  cachedAvailability = {
    ollama: ollamaModels,
    hasGroq: !!process.env.GROQ_API_KEY,
    hasGemini: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY),
    hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasOpenRouter: !!process.env.OPENROUTER_API_KEY
  };
  lastAvailabilityCheck = Date.now();

  console.log('[ModelStrategy] Available models:', {
    ollama: cachedAvailability.ollama.length > 0 ? cachedAvailability.ollama : 'none',
    cloud: Object.entries(cachedAvailability)
      .filter(([k, v]) => k.startsWith('has') && v)
      .map(([k]) => k.replace('has', ''))
  });

  return cachedAvailability;
}

function isModelAvailable(modelKey: keyof typeof MODELS, availability: AvailableModels): boolean {
  const model = MODELS[modelKey];
  
  switch (model.provider) {
    case 'ollama':
      // Check if the specific model is installed
      return availability.ollama.some(m => 
        m.startsWith(model.model.split(':')[0]) // Match base model name
      );
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
  const preferences = TASK_MODEL_PREFERENCES[task];
  
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
      
      console.log(`[ModelStrategy] Task "${task}" → ${modelKey} (${config.description})`);
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
    return { key: 'gpt4o', ...MODELS.gpt4o, fallbackChain: [] };
  }
  
  throw new Error(`No models available for task "${task}". Please install Ollama models or configure API keys.`);
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
    case 'ollama':
      return callOllama(config, prompt, systemPrompt);
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

async function callOllama(config: ModelConfig, prompt: string, systemPrompt?: string): Promise<string> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
      stream: false,
      options: {
        temperature: config.temperature ?? 0.7,
        num_predict: config.maxTokens ?? 4000
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }
  
  const data = await response.json() as { response: string };
  return data.response;
}

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
