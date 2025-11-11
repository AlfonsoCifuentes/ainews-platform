/**
 * Browser-based LLM using Transformers.js
 * Runs models directly in the browser using WebGPU/WASM
 * 
 * Benefits:
 * - $0.00 API costs after initial download
 * - Works 100% offline
 * - Complete privacy (nothing leaves browser)
 * - WebGPU acceleration on modern GPUs
 */

import { pipeline, env, type TextGenerationPipeline } from '@xenova/transformers';

// Configure Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;
env.allowRemoteModels = true;

// Set HuggingFace token for authenticated model access
// This allows downloading private or gated models like Phi-3.5 and Qwen2
const HF_TOKEN = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY;
if (HF_TOKEN) {
  console.log('[BrowserLLM] ✅ HuggingFace API token configured for authenticated model access');
}
// Note: The token will be automatically used by @xenova/transformers when making requests
// to HuggingFace Hub if NEXT_PUBLIC_HUGGINGFACE_API_KEY is set

export interface BrowserLLMConfig {
  modelId: string;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
}

export interface DownloadProgress {
  status: 'downloading' | 'loading' | 'ready' | 'error';
  progress: number; // 0-100
  file?: string;
  loaded?: number;
  total?: number;
}

const DEFAULT_CONFIG: BrowserLLMConfig = {
  modelId: 'Xenova/TinyLlama-1.1B-Chat-v1.0', // 637MB, public model
  maxTokens: 2000,
  temperature: 0.7,
  topK: 50,
  topP: 0.9,
};

// Recommended models by use case
// IMPORTANT: Using models from Xenova's public HuggingFace repos that don't require authentication
export const RECOMMENDED_MODELS = {
  // Best quality (larger download) - PUBLIC, no auth needed
  premium: 'Xenova/TinyLlama-1.1B-Chat-v1.0', // 637MB - Best available public model
  
  // Balanced (medium size) - PUBLIC, no auth needed  
  balanced: 'Xenova/distilgpt2', // ~350MB - Good for text generation
  
  // Fast (smaller download) - PUBLIC, no auth needed
  fast: 'Xenova/gpt2', // ~250MB - Classic GPT-2
  
  // Ultra-light (minimal download) - PUBLIC, no auth needed
  ultralight: 'Xenova/distilbert-base-uncased', // ~250MB - Lightweight
} as const;

export class BrowserLLM {
  private generator: TextGenerationPipeline | null = null;
  private config: BrowserLLMConfig;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  
  constructor(config: Partial<BrowserLLMConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Initialize the model (downloads on first use, then cached)
   */
  async initialize(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      return;
    }
    
    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    // Start initialization
    this.initializationPromise = this._initialize(onProgress);
    
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }
  
  private async _initialize(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    try {
      console.log(`[BrowserLLM] Initializing model: ${this.config.modelId}`);
      
      onProgress?.({
        status: 'downloading',
        progress: 0,
        file: this.config.modelId,
      });
      
      // Prepare pipeline options
      const pipelineOptions: Record<string, unknown> = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (data: any) => {
          if (data.status === 'progress') {
            const progress = Math.round((data.loaded / data.total) * 100);
            
            onProgress?.({
              status: 'downloading',
              progress,
              file: data.file,
              loaded: data.loaded,
              total: data.total,
            });
            
            console.log(
              `[BrowserLLM] Downloading ${data.file}: ${progress}% (${Math.round(data.loaded / 1024 / 1024)}MB / ${Math.round(data.total / 1024 / 1024)}MB)`
            );
          } else if (data.status === 'done') {
            onProgress?.({
              status: 'loading',
              progress: 100,
              file: data.file,
            });
          }
        },
      };
      
      // Add HuggingFace token if available (for gated/private models)
      const HF_TOKEN = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY;
      if (HF_TOKEN) {
        console.log('[BrowserLLM] Using HuggingFace authentication token');
        pipelineOptions.authorization = `Bearer ${HF_TOKEN}`;
      }
      
      this.generator = await pipeline(
        'text-generation',
        this.config.modelId,
        pipelineOptions
      );
      
      this.isInitialized = true;
      
      onProgress?.({
        status: 'ready',
        progress: 100,
      });
      
      console.log('[BrowserLLM] ✅ Model ready!');
      
    } catch (error) {
      console.error('[BrowserLLM] ❌ Initialization failed:', error);
      
      onProgress?.({
        status: 'error',
        progress: 0,
      });
      
      throw new Error(
        `Failed to initialize browser LLM: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  
  /**
   * Generate text using the browser-based model
   */
  async generate(
    prompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    if (!this.isInitialized || !this.generator) {
      throw new Error('Model not initialized. Call initialize() first.');
    }
    
    const fullPrompt = options.systemPrompt
      ? `<|system|>\n${options.systemPrompt}<|end|>\n<|user|>\n${prompt}<|end|>\n<|assistant|>`
      : prompt;
    
    try {
      console.log('[BrowserLLM] 🧠 Generating with browser model (ZERO COST)...');
      
      const result = await this.generator(fullPrompt, {
        max_new_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature,
        top_k: this.config.topK,
        top_p: this.config.topP,
        do_sample: true,
      });
      
      // Extract generated text from result
      let generatedText: string;
      if (Array.isArray(result)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generatedText = (result[0] as any)?.generated_text || '';
      } else if ('generated_text' in result) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generatedText = (result as any).generated_text;
      } else {
        generatedText = String(result);
      }
      
      // Remove the prompt from the response if present
      const response = generatedText.replace(fullPrompt, '').trim();
      
      console.log('[BrowserLLM] ✅ Generation complete (100% FREE)');
      
      return response;
      
    } catch (error) {
      console.error('[BrowserLLM] ❌ Generation failed:', error);
      throw error;
    }
  }
  
  /**
   * Check if model is ready to use
   */
  isReady(): boolean {
    return this.isInitialized && this.generator !== null;
  }
  
  /**
   * Get model info
   */
  getModelInfo() {
    return {
      modelId: this.config.modelId,
      isReady: this.isReady(),
      config: this.config,
    };
  }
  
  /**
   * Estimate model download size
   */
  static getModelSize(modelId: string): string {
    const sizes: Record<string, string> = {
      'Xenova/TinyLlama-1.1B-Chat-v1.0': '637MB',
      'Xenova/distilgpt2': '350MB',
      'Xenova/gpt2': '250MB',
      'Xenova/distilbert-base-uncased': '250MB',
    };
    
    return sizes[modelId] || 'Unknown';
  }
}

// Singleton instance for easy access
let browserLLMInstance: BrowserLLM | null = null;

export function getBrowserLLM(): BrowserLLM | null {
  return browserLLMInstance;
}

export function setBrowserLLM(instance: BrowserLLM | null): void {
  browserLLMInstance = instance;
}

export function isBrowserLLMReady(): boolean {
  return browserLLMInstance?.isReady() ?? false;
}
