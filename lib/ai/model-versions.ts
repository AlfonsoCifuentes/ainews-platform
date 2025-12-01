/**
 * AI MODEL VERSIONS - Single Source of Truth
 * 
 * ⚠️ CRITICAL: This file must be kept up-to-date with the latest AI model versions.
 * 
 * 🔄 UPDATE POLICY:
 * - Check official documentation MONTHLY or when new models are announced
 * - OpenAI: https://platform.openai.com/docs/models
 * - Google: https://ai.google.dev/models/gemini
 * - Anthropic: https://docs.anthropic.com/en/docs/about-claude/models
 * 
 * 📅 LAST UPDATED: 2025-01-XX (Update this date when modifying)
 * 
 * This file serves as the central configuration for all AI model versions
 * used throughout the AINews platform. It ensures consistency and makes
 * version updates a single-file operation.
 */

// ============================================================================
// VERSION METADATA
// ============================================================================

export const MODEL_VERSION_METADATA = {
  lastUpdated: '2025-01-XX',
  lastCheckedSources: {
    openai: 'https://openai.com/api/pricing/',
    google: 'https://ai.google.dev/models/gemini',
    anthropic: 'https://www.anthropic.com/claude',
    groq: 'https://console.groq.com/docs/models'
  }
};

// ============================================================================
// OPENAI MODELS (GPT-5.x Series - Latest as of 2025)
// ============================================================================

export const OPENAI_MODELS = {
  // === Flagship Models ===
  
  /** GPT-5 Pro - Smartest and most precise, premium tier */
  GPT_5_PRO: 'gpt-5-pro',
  
  /** GPT-5.1 - Best for coding and agentic tasks */
  GPT_5_1: 'gpt-5.1',
  
  /** GPT-5 Mini - Faster, cheaper for well-defined tasks */
  GPT_5_MINI: 'gpt-5-mini',
  
  /** GPT-5 Nano - Fastest, cheapest for summarization */
  GPT_5_NANO: 'gpt-5-nano',
  
  // === Reasoning Models (o-series) ===
  
  /** o3 - Advanced reasoning, multi-step problems */
  O3: 'o3',
  
  /** o4-mini - Faster reasoning model */
  O4_MINI: 'o4-mini',
  
  // === Fine-tuning Models ===
  
  /** GPT-4.1 - Fine-tunable flagship */
  GPT_4_1: 'gpt-4.1',
  
  /** GPT-4.1 Mini - Fine-tunable mini */
  GPT_4_1_MINI: 'gpt-4.1-mini',
  
  /** GPT-4.1 Nano - Fine-tunable nano */
  GPT_4_1_NANO: 'gpt-4.1-nano',
  
  // === Image Generation ===
  
  /** GPT-image-1 - High-fidelity image generation */
  GPT_IMAGE_1: 'gpt-image-1',
  
  /** GPT-image-1-mini - Faster image generation */
  GPT_IMAGE_1_MINI: 'gpt-image-1-mini',
  
  // === Realtime ===
  
  /** gpt-realtime - Low-latency multimodal */
  GPT_REALTIME: 'gpt-realtime',
  
  /** gpt-realtime-mini - Faster realtime */
  GPT_REALTIME_MINI: 'gpt-realtime-mini',
  
  // === Legacy (still available but not recommended) ===
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
} as const;

// ============================================================================
// GOOGLE GEMINI MODELS (Gemini 3.x Series - Latest as of 2025)
// ============================================================================

export const GEMINI_MODELS = {
  // === Flagship Models ===
  
  /** Gemini 3 Pro - Most intelligent, multimodal understanding */
  GEMINI_3_PRO: 'gemini-3-pro',
  
  /** Gemini 3 Pro Preview - Preview with latest features */
  GEMINI_3_PRO_PREVIEW: 'gemini-3-pro-preview',
  
  // === Image Generation ===
  
  /** Gemini 3 Pro Image - Advanced reasoning + image generation */
  GEMINI_3_PRO_IMAGE: 'gemini-3-pro-image-preview',
  
  // === Balanced Models ===
  
  /** Gemini 2.5 Pro - State-of-the-art thinking model */
  GEMINI_2_5_PRO: 'gemini-2.5-pro',
  
  /** Gemini 2.5 Flash - Best price-performance ratio */
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',
  
  /** Gemini 2.5 Flash-Lite - Fastest and cheapest */
  GEMINI_2_5_FLASH_LITE: 'gemini-2.5-flash-lite',
  
  /** Gemini 2.5 Flash Image - Fast image generation */
  GEMINI_2_5_FLASH_IMAGE: 'gemini-2.5-flash-image',
  
  // === Legacy (still available) ===
  GEMINI_1_5_PRO: 'gemini-1.5-pro',
  GEMINI_1_5_FLASH: 'gemini-1.5-flash',
} as const;

// ============================================================================
// ANTHROPIC CLAUDE MODELS (Claude 4.5 Series - Latest as of 2025)
// ============================================================================

export const CLAUDE_MODELS = {
  // === Latest Claude 4.5 Series ===
  
  /** Claude Opus 4.5 - Premium maximum intelligence */
  CLAUDE_OPUS_4_5: 'claude-opus-4-5-20251101',
  
  /** Claude Sonnet 4.5 - Best for complex agents and coding */
  CLAUDE_SONNET_4_5: 'claude-sonnet-4-5-20250929',
  
  /** Claude Haiku 4.5 - Fastest near-frontier performance */
  CLAUDE_HAIKU_4_5: 'claude-haiku-4-5-20251001',
  
  // === Claude 4.1 Series (Specialized) ===
  
  /** Claude Opus 4.1 - Specialized reasoning */
  CLAUDE_OPUS_4_1: 'claude-opus-4-1-20250805',
  
  // === Aliases for easier use ===
  
  /** Latest Claude flagship */
  CLAUDE_FLAGSHIP: 'claude-opus-4-5-20251101',
  
  /** Latest Claude balanced */
  CLAUDE_BALANCED: 'claude-sonnet-4-5-20250929',
  
  /** Latest Claude fast */
  CLAUDE_FAST: 'claude-haiku-4-5-20251001',
  
  // === Legacy (deprecated, but still functional) ===
  CLAUDE_3_5_SONNET: 'claude-3-5-sonnet-20241022',
  CLAUDE_3_5_HAIKU: 'claude-3-5-haiku-20241022',
  CLAUDE_3_OPUS: 'claude-3-opus-20240229',
} as const;

// ============================================================================
// GROQ MODELS (Fastest cloud inference)
// ============================================================================

export const GROQ_MODELS = {
  /** Llama 3.3 70B - Ultra fast cloud inference */
  LLAMA_3_3_70B: 'llama-3.3-70b-versatile',
  
  /** Llama 3.1 70B - Stable version */
  LLAMA_3_1_70B: 'llama-3.1-70b-versatile',
  
  /** Llama 3.1 8B - Fast, lightweight */
  LLAMA_3_1_8B: 'llama-3.1-8b-instant',
  
  /** Mixtral 8x7B - Good for variety */
  MIXTRAL_8X7B: 'mixtral-8x7b-32768',
} as const;

// ============================================================================
// OPENROUTER MODELS (Free tier access)
// ============================================================================

export const OPENROUTER_MODELS = {
  /** Llama 3.3 70B Instruct - Free tier */
  LLAMA_3_3_70B_FREE: 'meta-llama/llama-3.3-70b-instruct:free',
  
  /** Qwen 2.5 72B - Free tier */
  QWEN_2_5_72B_FREE: 'qwen/qwen-2.5-72b-instruct:free',
  
  /** DeepSeek Chat - Free tier */
  DEEPSEEK_CHAT_FREE: 'deepseek/deepseek-chat:free',
} as const;

// ============================================================================
// OLLAMA LOCAL MODELS
// ============================================================================

export const OLLAMA_MODELS = {
  /** DeepSeek R1 70B - Exceptional reasoning */
  DEEPSEEK_R1_70B: 'deepseek-r1:70b',
  
  /** DeepSeek R1 32B - Balanced reasoning */
  DEEPSEEK_R1_32B: 'deepseek-r1:32b',
  
  /** DeepSeek R1 14B - Lighter reasoning */
  DEEPSEEK_R1_14B: 'deepseek-r1:14b',
  
  /** Qwen3 30B - Excellent prose, 100+ languages */
  QWEN3_30B: 'qwen3:30b',
  
  /** Qwen3 14B - Faster Qwen */
  QWEN3_14B: 'qwen3:14b',
  
  /** Qwen2.5 14B - Previous gen, still good */
  QWEN2_5_14B: 'qwen2.5:14b',
  
  /** Llama 3.1 8B - Fast local */
  LLAMA3_1_8B: 'llama3.1:8b',
} as const;

// ============================================================================
// RECOMMENDED MODELS BY USE CASE
// ============================================================================

export const RECOMMENDED_MODELS = {
  /** For complex reasoning, planning, and validation */
  reasoning: {
    local: OLLAMA_MODELS.DEEPSEEK_R1_70B,
    cloud: OPENAI_MODELS.O3,
    budget: CLAUDE_MODELS.CLAUDE_SONNET_4_5,
  },
  
  /** For high-quality prose and content generation */
  content: {
    local: OLLAMA_MODELS.QWEN3_30B,
    cloud: CLAUDE_MODELS.CLAUDE_SONNET_4_5,
    budget: GROQ_MODELS.LLAMA_3_3_70B,
  },
  
  /** For fast classification and simple tasks */
  fast: {
    local: OLLAMA_MODELS.LLAMA3_1_8B,
    cloud: GROQ_MODELS.LLAMA_3_1_8B,
    budget: GEMINI_MODELS.GEMINI_2_5_FLASH_LITE,
  },
  
  /** For code generation */
  coding: {
    local: OLLAMA_MODELS.DEEPSEEK_R1_70B,
    cloud: OPENAI_MODELS.GPT_5_1,
    budget: CLAUDE_MODELS.CLAUDE_SONNET_4_5,
  },
  
  /** For image generation */
  imageGeneration: {
    primary: GEMINI_MODELS.GEMINI_3_PRO_IMAGE,
    fast: GEMINI_MODELS.GEMINI_2_5_FLASH_IMAGE,
    openai: OPENAI_MODELS.GPT_IMAGE_1,
  },
  
  /** For multilingual/translation */
  multilingual: {
    local: OLLAMA_MODELS.QWEN3_30B, // 100+ languages
    cloud: GEMINI_MODELS.GEMINI_3_PRO,
    budget: GROQ_MODELS.LLAMA_3_3_70B,
  },
  
  /** For maximum quality (cost not a concern) */
  premium: {
    openai: OPENAI_MODELS.GPT_5_PRO,
    anthropic: CLAUDE_MODELS.CLAUDE_OPUS_4_5,
    google: GEMINI_MODELS.GEMINI_3_PRO,
  },
} as const;

// ============================================================================
// MODEL CAPABILITIES MAP
// ============================================================================

export interface ModelCapabilities {
  contextWindow: number;
  maxOutputTokens: number;
  supportsImages: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
  costTier: 'free' | 'low' | 'medium' | 'high' | 'premium';
  speed: 'slow' | 'medium' | 'fast' | 'instant';
}

export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  // OpenAI
  [OPENAI_MODELS.GPT_5_PRO]: {
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsImages: true,
    supportsTools: true,
    supportsStreaming: true,
    costTier: 'premium',
    speed: 'medium',
  },
  [OPENAI_MODELS.GPT_5_1]: {
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsImages: true,
    supportsTools: true,
    supportsStreaming: true,
    costTier: 'high',
    speed: 'medium',
  },
  [OPENAI_MODELS.GPT_5_NANO]: {
    contextWindow: 128000,
    maxOutputTokens: 8192,
    supportsImages: true,
    supportsTools: true,
    supportsStreaming: true,
    costTier: 'low',
    speed: 'fast',
  },
  
  // Claude
  [CLAUDE_MODELS.CLAUDE_OPUS_4_5]: {
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsImages: true,
    supportsTools: true,
    supportsStreaming: true,
    costTier: 'premium',
    speed: 'medium',
  },
  [CLAUDE_MODELS.CLAUDE_SONNET_4_5]: {
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsImages: true,
    supportsTools: true,
    supportsStreaming: true,
    costTier: 'medium',
    speed: 'fast',
  },
  [CLAUDE_MODELS.CLAUDE_HAIKU_4_5]: {
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsImages: true,
    supportsTools: true,
    supportsStreaming: true,
    costTier: 'low',
    speed: 'instant',
  },
  
  // Gemini
  [GEMINI_MODELS.GEMINI_3_PRO]: {
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    supportsImages: true,
    supportsTools: true,
    supportsStreaming: true,
    costTier: 'medium',
    speed: 'medium',
  },
  [GEMINI_MODELS.GEMINI_2_5_FLASH]: {
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    supportsImages: true,
    supportsTools: true,
    supportsStreaming: true,
    costTier: 'low',
    speed: 'fast',
  },
  
  // Groq (free tier)
  [GROQ_MODELS.LLAMA_3_3_70B]: {
    contextWindow: 131072,
    maxOutputTokens: 8192,
    supportsImages: false,
    supportsTools: true,
    supportsStreaming: true,
    costTier: 'free',
    speed: 'instant',
  },
  
  // Ollama local
  [OLLAMA_MODELS.DEEPSEEK_R1_70B]: {
    contextWindow: 65536,
    maxOutputTokens: 8000,
    supportsImages: false,
    supportsTools: false,
    supportsStreaming: true,
    costTier: 'free',
    speed: 'slow',
  },
  [OLLAMA_MODELS.QWEN3_30B]: {
    contextWindow: 40960,
    maxOutputTokens: 8000,
    supportsImages: false,
    supportsTools: false,
    supportsStreaming: true,
    costTier: 'free',
    speed: 'medium',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the latest model for a specific provider
 */
export function getLatestModel(
  provider: 'openai' | 'anthropic' | 'google' | 'groq',
  tier: 'flagship' | 'balanced' | 'fast' = 'balanced'
): string {
  const models = {
    openai: {
      flagship: OPENAI_MODELS.GPT_5_PRO,
      balanced: OPENAI_MODELS.GPT_5_1,
      fast: OPENAI_MODELS.GPT_5_NANO,
    },
    anthropic: {
      flagship: CLAUDE_MODELS.CLAUDE_OPUS_4_5,
      balanced: CLAUDE_MODELS.CLAUDE_SONNET_4_5,
      fast: CLAUDE_MODELS.CLAUDE_HAIKU_4_5,
    },
    google: {
      flagship: GEMINI_MODELS.GEMINI_3_PRO,
      balanced: GEMINI_MODELS.GEMINI_2_5_PRO,
      fast: GEMINI_MODELS.GEMINI_2_5_FLASH,
    },
    groq: {
      flagship: GROQ_MODELS.LLAMA_3_3_70B,
      balanced: GROQ_MODELS.LLAMA_3_3_70B,
      fast: GROQ_MODELS.LLAMA_3_1_8B,
    },
  };
  
  return models[provider][tier];
}

/**
 * Get model capabilities
 */
export function getModelCapabilities(model: string): ModelCapabilities | undefined {
  return MODEL_CAPABILITIES[model];
}

/**
 * Check if a model is deprecated
 */
export function isModelDeprecated(model: string): boolean {
  const deprecatedModels = [
    'gpt-4',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku',
    'claude-2',
    'gemini-1.0-pro',
    'gemini-pro',
  ];
  
  return deprecatedModels.some(deprecated => 
    model.toLowerCase().includes(deprecated.toLowerCase())
  );
}

/**
 * Get recommended replacement for deprecated model
 */
export function getModelReplacement(deprecatedModel: string): string {
  const replacements: Record<string, string> = {
    'gpt-4': OPENAI_MODELS.GPT_5_1,
    'gpt-4-turbo': OPENAI_MODELS.GPT_5_1,
    'gpt-4o': OPENAI_MODELS.GPT_5_1,
    'gpt-3.5-turbo': OPENAI_MODELS.GPT_5_NANO,
    'claude-3-opus': CLAUDE_MODELS.CLAUDE_OPUS_4_5,
    'claude-3-sonnet': CLAUDE_MODELS.CLAUDE_SONNET_4_5,
    'claude-3-5-sonnet': CLAUDE_MODELS.CLAUDE_SONNET_4_5,
    'claude-3-haiku': CLAUDE_MODELS.CLAUDE_HAIKU_4_5,
    'gemini-1.5-pro': GEMINI_MODELS.GEMINI_3_PRO,
    'gemini-1.5-flash': GEMINI_MODELS.GEMINI_2_5_FLASH,
    'gemini-pro': GEMINI_MODELS.GEMINI_3_PRO,
  };
  
  for (const [old, replacement] of Object.entries(replacements)) {
    if (deprecatedModel.toLowerCase().includes(old.toLowerCase())) {
      return replacement;
    }
  }
  
  return CLAUDE_MODELS.CLAUDE_SONNET_4_5; // Safe default
}

// ============================================================================
// EXPORTS
// ============================================================================

export type OpenAIModel = typeof OPENAI_MODELS[keyof typeof OPENAI_MODELS];
export type GeminiModel = typeof GEMINI_MODELS[keyof typeof GEMINI_MODELS];
export type ClaudeModel = typeof CLAUDE_MODELS[keyof typeof CLAUDE_MODELS];
export type GroqModel = typeof GROQ_MODELS[keyof typeof GROQ_MODELS];
export type OllamaModel = typeof OLLAMA_MODELS[keyof typeof OLLAMA_MODELS];
