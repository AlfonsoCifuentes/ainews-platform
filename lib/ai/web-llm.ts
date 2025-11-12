import type { AppConfig, InitProgressCallback, MLCEngine } from '@mlc-ai/web-llm';

/**
 * Metadata describing a WebLLM model that the UI can surface.
 */
export interface WebLLMModelMetadata {
  modelId: string;
  label: string;
  size: string;
  description: string;
  recommended?: boolean;
}

export interface WebLLMSnapshot {
  engine: MLCEngine | null;
  modelId: string | null;
  ready: boolean;
}

export interface WebLLMGenerateOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export const DEFAULT_WEBLLM_MODEL_ID = 'Llama-3.1-8B-Instruct-q4f32_1';

const MODEL_METADATA: Record<string, WebLLMModelMetadata> = {
  [DEFAULT_WEBLLM_MODEL_ID]: {
    modelId: DEFAULT_WEBLLM_MODEL_ID,
    label: 'Llama 3.1 8B (Q4)',
    size: '4.8 GB',
    description: 'Flagship 8B instruct model quantized for WebGPU with ~8K context.',
    recommended: true,
  },
  'Mistral-7B-Instruct-v0.2-q4f16_1': {
    modelId: 'Mistral-7B-Instruct-v0.2-q4f16_1',
    label: 'Mistral 7B Instruct (Q4)',
    size: '4.2 GB',
    description: 'Balanced 7B instruct model, good mix of quality and speed.',
  },
  'Phi-3.5-mini-instruct-q4f16_1': {
    modelId: 'Phi-3.5-mini-instruct-q4f16_1',
    label: 'Phi 3.5 Mini Instruct (Q4)',
    size: '1.8 GB',
    description: 'Smaller privacy-first model ideal for limited GPUs.',
  },
};

export const WEBLLM_MODEL_CATALOG: WebLLMModelMetadata[] = Object.values(MODEL_METADATA);

let webLLMPromise: Promise<typeof import('@mlc-ai/web-llm')> | null = null;

async function getWebLLMPackage() {
  if (!webLLMPromise) {
    webLLMPromise = import('@mlc-ai/web-llm');
  }
  return webLLMPromise;
}

const state: WebLLMSnapshot = {
  engine: null,
  modelId: null,
  ready: false,
};

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeWebLLM(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getWebLLMSnapshot(): WebLLMSnapshot {
  return { ...state };
}

export function isWebGPUSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof (navigator as Navigator & { gpu?: unknown }).gpu !== 'undefined';
}

export function isWebLLMReady(): boolean {
  return state.ready;
}

export function getLoadedWebLLMModelId(): string | null {
  return state.modelId;
}

export async function detectWebLLMCachedModels(appConfig?: AppConfig): Promise<WebLLMModelMetadata[]> {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const { hasModelInCache, prebuiltAppConfig } = await getWebLLMPackage();
    const config = appConfig ?? prebuiltAppConfig;
    const cached: WebLLMModelMetadata[] = [];

    for (const record of config.model_list) {
      try {
        // Sequential check keeps memory footprint low for large model lists
        const inCache = await hasModelInCache(record.model_id, config);
        if (inCache) {
          cached.push(getWebLLMModelMetadata(record.model_id));
        }
      } catch (error) {
        console.warn(`[WebLLM] Failed to detect cache for ${record.model_id}:`, error);
      }
    }

    return cached;
  } catch (error) {
    console.warn('[WebLLM] Unable to inspect cached models:', error);
    return [];
  }
}

export function getWebLLMModelMetadata(modelId: string): WebLLMModelMetadata {
  if (MODEL_METADATA[modelId]) {
    return MODEL_METADATA[modelId];
  }

  return {
    modelId,
    label: modelId,
    size: 'Unknown size',
    description: 'Custom WebLLM model detected in cache.',
  };
}

export async function loadWebLLMModel(
  modelId: string,
  onProgress?: InitProgressCallback,
  appConfig?: AppConfig,
): Promise<MLCEngine> {
  if (!isWebGPUSupported()) {
    throw new Error('WebGPU is not available in this browser. WebLLM cannot be loaded.');
  }

  if (state.engine && state.modelId === modelId) {
    return state.engine;
  }

  const { CreateMLCEngine, prebuiltAppConfig } = await getWebLLMPackage();

  if (state.engine) {
    try {
      await state.engine.unload();
    } catch (error) {
      console.warn('[WebLLM] Unable to unload previous engine instance:', error);
    }
  }

  const engine = await CreateMLCEngine(modelId, {
    initProgressCallback: onProgress,
    appConfig: appConfig ?? prebuiltAppConfig,
  });

  state.engine = engine;
  state.modelId = modelId;
  state.ready = true;
  notify();
  return engine;
}

export async function clearWebLLMEngine(): Promise<void> {
  if (!state.engine) {
    return;
  }

  try {
    await state.engine.unload();
  } catch (error) {
    console.warn('[WebLLM] Failed to unload engine during clear:', error);
  } finally {
    state.engine = null;
    state.modelId = null;
    state.ready = false;
    notify();
  }
}

export async function generateWebLLMCompletion(
  prompt: string,
  options: WebLLMGenerateOptions = {},
): Promise<string> {
  const engine = state.engine;
  if (!engine) {
    throw new Error('WebLLM engine is not ready. Load a model before generating.');
  }

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await engine.chat.completions.create({
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 512,
    stream: false,
  });

  return response.choices?.[0]?.message?.content ?? '';
}
