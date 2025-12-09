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
 * used throughout the ThotNet Core platform. It ensures consistency and makes
 * version updates a single-file operation.
 */

// ============================================================================
// VERSION METADATA
// ============================================================================

export const MODEL_VERSION_METADATA = {
  lastUpdated: '2025-12-09',
  lastCheckedSources: {
    openai: 'https://openai.com/api/pricing/',
    google: 'https://ai.google.dev/gemini-api/docs/models',
    anthropic: 'https://platform.claude.com/docs/en/about-claude/models/overview',
    groq: 'https://console.groq.com/docs/models',
    deepseek: 'https://api-docs.deepseek.com/quick_start/pricing',
    mistral: 'https://docs.mistral.ai/getting-started/models/models_overview/'
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
// GROQ MODELS (Fastest cloud inference - December 2025)
// ============================================================================

export const GROQ_MODELS = {
  // === Production Models ===
  
  /** Llama 3.3 70B - Ultra fast cloud inference (280 tok/s) */
  LLAMA_3_3_70B: 'llama-3.3-70b-versatile',
  
  /** Llama 3.1 8B - Fast, lightweight (560 tok/s) */
  LLAMA_3_1_8B: 'llama-3.1-8b-instant',
  
  /** OpenAI GPT-OSS 120B - OpenAI's open-weight model (500 tok/s) */
  GPT_OSS_120B: 'openai/gpt-oss-120b',
  
  /** OpenAI GPT-OSS 20B - Lighter version (1000 tok/s) */
  GPT_OSS_20B: 'openai/gpt-oss-20b',
  
  // === Preview Models ===
  
  /** Llama 4 Maverick 17B - Latest Llama 4 (600 tok/s) */
  LLAMA_4_MAVERICK: 'meta-llama/llama-4-maverick-17b-128e-instruct',
  
  /** Llama 4 Scout 17B - Fast Llama 4 (750 tok/s) */
  LLAMA_4_SCOUT: 'meta-llama/llama-4-scout-17b-16e-instruct',
  
  /** Qwen3 32B - Alibaba's latest (400 tok/s) */
  QWEN3_32B: 'qwen/qwen3-32b',
  
  /** Kimi K2 - Moonshot AI reasoning model */
  KIMI_K2: 'moonshotai/kimi-k2-instruct-0905',
  
  // === Compound Systems (Agentic) ===
  
  /** Groq Compound - Agentic with web search + code execution */
  COMPOUND: 'groq/compound',
  
  /** Groq Compound Mini - Lighter agentic system */
  COMPOUND_MINI: 'groq/compound-mini',
  
  // === Legacy ===
  LLAMA_3_1_70B: 'llama-3.1-70b-versatile',
  MIXTRAL_8X7B: 'mixtral-8x7b-32768',
} as const;

// ============================================================================
// DEEPSEEK MODELS (Best price/performance for reasoning - December 2025)
// ============================================================================

export const DEEPSEEK_MODELS = {
  // === Latest V3.2 Series ===
  
  /** DeepSeek Chat - V3.2 Non-thinking mode */
  DEEPSEEK_CHAT: 'deepseek-chat',
  
  /** DeepSeek Reasoner - V3.2 Thinking mode (CoT reasoning) */
  DEEPSEEK_REASONER: 'deepseek-reasoner',
  
  /** DeepSeek V3.2 Speciale - Extended thinking (128K output) */
  DEEPSEEK_SPECIALE: 'deepseek-v3.2-speciale',
  
  // === Pricing info ===
  // Input (cache miss): $0.28/1M tokens
  // Input (cache hit): $0.028/1M tokens  
  // Output: $0.42/1M tokens
  // Context: 128K tokens
} as const;

// ============================================================================
// MISTRAL MODELS (Best multilingual - December 2025)
// ============================================================================

export const MISTRAL_MODELS = {
  // === Frontier Generalist Models ===
  
  /** Mistral Medium 3.1 - Frontier multimodal (August 2025) */
  MISTRAL_MEDIUM_3_1: 'mistral-medium-3.1-2508',
  
  /** Mistral Small 3.2 - Fast & efficient (June 2025) */
  MISTRAL_SMALL_3_2: 'mistral-small-3.2-2506',
  
  // === Reasoning Models (Magistral) ===
  
  /** Magistral Medium 1.2 - Frontier reasoning (September 2025) */
  MAGISTRAL_MEDIUM_1_2: 'magistral-medium-1.2-2509',
  
  /** Magistral Small 1.2 - Fast reasoning (September 2025) */
  MAGISTRAL_SMALL_1_2: 'magistral-small-1.2-2509',
  
  // === Specialist Models ===
  
  /** Codestral - Cutting-edge coding (July 2025) */
  CODESTRAL: 'codestral-2508',
  
  /** Devstral Medium - Enterprise SWE (July 2025) */
  DEVSTRAL_MEDIUM: 'devstral-medium-1.0-2507',
  
  /** Devstral Small - Open source SWE (July 2025) */
  DEVSTRAL_SMALL: 'devstral-small-1.1-2507',
  
  // === Audio Models ===
  
  /** Voxtral Small - Audio input for instruct */
  VOXTRAL_SMALL: 'voxtral-small-2507',
  
  /** Voxtral Mini - Lighter audio model */
  VOXTRAL_MINI: 'voxtral-mini-2507',
  
  // === Vision/Multimodal ===
  
  /** Pixtral Large - Frontier multimodal (November 2024) */
  PIXTRAL_LARGE: 'pixtral-large-2411',
  
  // === Legacy ===
  MISTRAL_LARGE_2_1: 'mistral-large-2.1-2411',
  MISTRAL_MEDIUM_3: 'mistral-medium-3-2505',
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
// IMAGE MODELS (Flux primary, Qwen fallback)
// ============================================================================
export const HUGGINGFACE_IMAGE_MODELS = {
  /** Flux 1 Dev GGUF - HuggingFace Inference (city96) */
  FLUX_1_DEV_GGUF: 'city96/FLUX.1-dev-gguf',
} as const;

export const QWEN_IMAGE_MODELS = {
  /** Qwen-Image (DashScope) - Text-to-image */
  QWEN_IMAGE_V1: 'qwen-vl-plus',
} as const;

export const RUNWAY_IMAGE_MODELS = {
  /** Runware Gen (cheap default for course images) */
  RUNWAY_GEN_97: 'runware:97@3',
} as const;

// ============================================================================
// RECOMMENDED MODELS BY USE CASE (Updated December 2025)
// ============================================================================

export const RECOMMENDED_MODELS = {
  /** For complex reasoning, planning, and validation */
  reasoning: {
    local: OLLAMA_MODELS.DEEPSEEK_R1_70B,
    cloud: OPENAI_MODELS.O3,
    budget: DEEPSEEK_MODELS.DEEPSEEK_REASONER, // Best price/quality for reasoning
    ultraFast: GROQ_MODELS.LLAMA_3_3_70B,
  },
  
  /** For high-quality prose and content generation */
  content: {
    local: OLLAMA_MODELS.QWEN3_30B,
    cloud: CLAUDE_MODELS.CLAUDE_SONNET_4_5, // Best prose quality
    budget: DEEPSEEK_MODELS.DEEPSEEK_CHAT,
    ultraFast: GROQ_MODELS.LLAMA_3_3_70B,
  },
  
  /** For fast classification and simple tasks */
  fast: {
    local: OLLAMA_MODELS.LLAMA3_1_8B,
    cloud: CLAUDE_MODELS.CLAUDE_HAIKU_4_5,
    budget: GEMINI_MODELS.GEMINI_2_5_FLASH_LITE,
    ultraFast: GROQ_MODELS.LLAMA_3_1_8B, // 560 tok/s!
  },
  
  /** For code generation */
  coding: {
    local: OLLAMA_MODELS.DEEPSEEK_R1_70B,
    cloud: OPENAI_MODELS.GPT_5_1, // Best for coding
    budget: MISTRAL_MODELS.CODESTRAL,
    ultraFast: GROQ_MODELS.GPT_OSS_120B,
  },
  
  /** For image generation (Nano Banana Pro) */
  imageGeneration: {
    primary: RUNWAY_IMAGE_MODELS.RUNWAY_GEN_97,         // Runware (cheaper default)
    fallback: GEMINI_MODELS.GEMINI_3_PRO_IMAGE,         // Gemini 3 Pro Image for diagrams/backup
    legacy: HUGGINGFACE_IMAGE_MODELS.FLUX_1_DEV_GGUF,   // Legacy Flux via HF Inference
  },
  
  /** For multilingual/translation */
  multilingual: {
    local: OLLAMA_MODELS.QWEN3_30B, // 100+ languages
    cloud: MISTRAL_MODELS.MISTRAL_MEDIUM_3_1, // Excellent multilingual
    budget: GEMINI_MODELS.GEMINI_2_5_FLASH,
    ultraFast: GROQ_MODELS.QWEN3_32B,
  },
  
  /** For maximum quality (cost not a concern) */
  premium: {
    openai: OPENAI_MODELS.GPT_5_PRO,
    anthropic: CLAUDE_MODELS.CLAUDE_OPUS_4_5,
    google: GEMINI_MODELS.GEMINI_3_PRO,
  },
  
  /** For educational content (courses) - OPTIMIZED MIX */
  education: {
    /** Structure & planning */
    planning: DEEPSEEK_MODELS.DEEPSEEK_REASONER,
    /** Main prose content */
    prose: CLAUDE_MODELS.CLAUDE_SONNET_4_5,
    /** Exercises & quizzes */
    exercises: OPENAI_MODELS.GPT_5_1,
    /** Fast drafts */
    drafts: GROQ_MODELS.LLAMA_3_3_70B,
    /** Translations */
    translation: MISTRAL_MODELS.MISTRAL_MEDIUM_3_1,
    /** Images */
    images: RUNWAY_IMAGE_MODELS.RUNWAY_GEN_97,
  },
  
  /** For agentic workflows */
  agentic: {
    cloud: GROQ_MODELS.COMPOUND, // Built-in web search + code execution
    openai: OPENAI_MODELS.GPT_5_1,
    anthropic: CLAUDE_MODELS.CLAUDE_SONNET_4_5,
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
export type DeepSeekModel = typeof DEEPSEEK_MODELS[keyof typeof DEEPSEEK_MODELS];
export type MistralModel = typeof MISTRAL_MODELS[keyof typeof MISTRAL_MODELS];
export type OllamaModel = typeof OLLAMA_MODELS[keyof typeof OLLAMA_MODELS];
export type HuggingFaceImageModel = typeof HUGGINGFACE_IMAGE_MODELS[keyof typeof HUGGINGFACE_IMAGE_MODELS];
export type QwenImageModel = typeof QWEN_IMAGE_MODELS[keyof typeof QWEN_IMAGE_MODELS];
export type RunwayImageModel = typeof RUNWAY_IMAGE_MODELS[keyof typeof RUNWAY_IMAGE_MODELS];

// Union type for all cloud models
export type CloudModel = OpenAIModel | GeminiModel | ClaudeModel | GroqModel | DeepSeekModel | MistralModel;

// ============================================================================
// COURSE UPGRADE WORKFLOW - Optimal AI Mix
// ============================================================================

/**
 * Optimized workflow for upgrading courses to textbook quality.
 * Uses the best AI for each specific task.
 */
export const COURSE_UPGRADE_WORKFLOW = {
  /** Step 1: Analyze existing content & create expansion plan */
  analysis: {
    model: DEEPSEEK_MODELS.DEEPSEEK_REASONER,
    provider: 'deepseek',
    reason: 'Best reasoning at lowest cost - ideal for planning',
  },
  
  /** Step 2: Generate main prose content (sections, explanations) */
  prose: {
    model: CLAUDE_MODELS.CLAUDE_SONNET_4_5,
    provider: 'anthropic',
    reason: 'Best prose quality, natural writing style',
  },
  
  /** Step 3: Generate case studies with real-world examples */
  caseStudies: {
    model: OPENAI_MODELS.GPT_5_1,
    provider: 'openai',
    reason: 'Excellent at structured, detailed examples',
  },
  
  /** Step 4: Generate exercises, quizzes, exam questions */
  exercises: {
    model: GROQ_MODELS.LLAMA_3_3_70B,
    provider: 'groq',
    reason: 'Ultra-fast, good quality - perfect for many small generations',
  },
  
  /** Step 5: Generate educational diagrams and illustrations */
  images: {
    model: HUGGINGFACE_IMAGE_MODELS.FLUX_1_DEV_GGUF,
    provider: 'huggingface',
    reason: 'Flux 1 Dev GGUF (HF router) - best visual fidelity, free-tier friendly',
  },
  
  /** Step 6: Translate content to second language */
  translation: {
    model: MISTRAL_MODELS.MISTRAL_MEDIUM_3_1,
    provider: 'mistral',
    reason: 'Excellent multilingual, preserves technical accuracy',
  },
  
  /** Step 7: Final quality review & consistency check */
  review: {
    model: CLAUDE_MODELS.CLAUDE_SONNET_4_5,
    provider: 'anthropic',
    reason: 'Best at maintaining consistent tone & quality',
  },
} as const;
