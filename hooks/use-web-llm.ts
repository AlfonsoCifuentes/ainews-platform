'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import {
  DEFAULT_WEBLLM_MODEL_ID,
  detectWebLLMCachedModels,
  generateWebLLMCompletion,
  getWebLLMSnapshot,
  isWebGPUSupported,
  loadWebLLMModel,
  subscribeWebLLM,
  type WebLLMGenerateOptions,
  type WebLLMModelMetadata,
  type WebLLMSnapshot,
} from '@/lib/ai/web-llm';

interface UseWebLLMOptions {
  defaultModelId?: string;
  autoLoadFromCache?: boolean;
  onReady?: (modelId: string) => void;
}

export interface UseWebLLMResult {
  supported: boolean;
  ready: boolean;
  engineModelId: string | null;
  selectedModelId: string;
  setSelectedModelId: (modelId: string) => void;
  cachedModels: WebLLMModelMetadata[];
  checkingCache: boolean;
  progress: number;
  statusText: string;
  isLoading: boolean;
  error: string | null;
  loadModel: (modelId?: string) => Promise<void>;
  refreshCachedModels: () => Promise<void>;
  generate: (prompt: string, options?: WebLLMGenerateOptions) => Promise<string>;
}

export function useWebLLM(options: UseWebLLMOptions = {}): UseWebLLMResult {
  const { defaultModelId = DEFAULT_WEBLLM_MODEL_ID, autoLoadFromCache = false, onReady } = options;
  
  // Server-safe snapshot function that returns empty state during SSR
  const getServerSnapshot = useCallback((): WebLLMSnapshot => {
    return { engine: null, modelId: null, ready: false };
  }, []);
  
  const snapshot = useSyncExternalStore(subscribeWebLLM, getWebLLMSnapshot, getServerSnapshot);

  const [supported, setSupported] = useState<boolean>(false);
  const [selectedModelId, setSelectedModelId] = useState<string>(defaultModelId);
  const [cachedModels, setCachedModels] = useState<WebLLMModelMetadata[]>([]);
  const [checkingCache, setCheckingCache] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [autoLoadedOnce, setAutoLoadedOnce] = useState<boolean>(false);

  useEffect(() => {
    setSupported(isWebGPUSupported());
  }, []);

  const refreshCachedModels = useCallback(async () => {
    if (!supported) {
      setCachedModels([]);
      return;
    }

    setCheckingCache(true);
    try {
      const detected = await detectWebLLMCachedModels();
      setCachedModels(detected);
      if (detected.length > 0 && !snapshot.ready) {
        setSelectedModelId((current) => (current ? current : detected[0].modelId));
      }
    } finally {
      setCheckingCache(false);
    }
  }, [supported, snapshot.ready]);

  useEffect(() => {
    void refreshCachedModels();
  }, [refreshCachedModels]);

  useEffect(() => {
    if (!snapshot.ready || !snapshot.modelId) {
      return;
    }
    if (onReady) {
      onReady(snapshot.modelId);
    }
  }, [snapshot.ready, snapshot.modelId, onReady]);

  const loadModel = useCallback(
    async (modelIdParam?: string) => {
      const modelToLoad = modelIdParam ?? selectedModelId;
      if (!supported) {
        setError('WebGPU is not available in this browser.');
        return;
      }

      setIsLoading(true);
      setProgress(0);
      setStatusText('');
      setError(null);

      try {
        await loadWebLLMModel(modelToLoad, (report) => {
          setProgress(Math.round(report.progress * 100));
          if (report.text) {
            setStatusText(report.text);
          }
        });
        setProgress(100);
        setStatusText('');
        setSelectedModelId(modelToLoad);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown WebLLM load error';
        console.error('[WebLLM] Failed to load model', err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedModelId, supported],
  );

  useEffect(() => {
    if (!autoLoadFromCache || autoLoadedOnce || snapshot.ready) {
      return;
    }

    if (cachedModels.length === 0) {
      return;
    }

    setAutoLoadedOnce(true);
    void loadModel(cachedModels[0].modelId);
  }, [autoLoadFromCache, autoLoadedOnce, cachedModels, snapshot.ready, loadModel]);

  const generate = useCallback(
    async (prompt: string, options?: WebLLMGenerateOptions) => {
      return generateWebLLMCompletion(prompt, options);
    },
    [],
  );

  return {
    supported,
    ready: snapshot.ready,
    engineModelId: snapshot.modelId,
    selectedModelId,
    setSelectedModelId,
    cachedModels,
    checkingCache,
    progress,
    statusText,
    isLoading,
    error,
    loadModel,
    refreshCachedModels,
    generate,
  };
}

export function useWebLLMStatus(): WebLLMSnapshot {
  return useSyncExternalStore(subscribeWebLLM, getWebLLMSnapshot, getWebLLMSnapshot);
}
