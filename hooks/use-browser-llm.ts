'use client';

import { useState, useCallback, useEffect } from 'react';
import { BrowserLLM, getBrowserLLM, setBrowserLLM, type DownloadProgress } from '@/lib/ai/browser-llm';

interface UseBrowserLLMOptions {
  autoInitialize?: boolean;
  modelId?: string;
}

export function useBrowserLLM(options: UseBrowserLLMOptions = {}) {
  const [llm, setLlm] = useState<BrowserLLM | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Check for existing instance
  useEffect(() => {
    const existing = getBrowserLLM();
    if (existing?.isReady()) {
      setLlm(existing);
      setIsReady(true);
    } else if (options.autoInitialize) {
      initialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialize = useCallback(async () => {
    if (isReady || isInitializing) return;

    setIsInitializing(true);
    setError(null);

    try {
      const instance = new BrowserLLM({
        modelId: options.modelId,
      });

      await instance.initialize((prog) => {
        setProgress(prog);
      });

      setLlm(instance);
      setBrowserLLM(instance);
      setIsReady(true);
      setProgress({ status: 'ready', progress: 100 });

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize');
      setError(error);
      setProgress({ status: 'error', progress: 0 });
    } finally {
      setIsInitializing(false);
    }
  }, [options.modelId, isReady, isInitializing]);

  const generate = useCallback(
    async (
      prompt: string,
      opts?: {
        maxTokens?: number;
        temperature?: number;
        systemPrompt?: string;
      }
    ): Promise<string> => {
      if (!llm || !isReady) {
        throw new Error('Model not ready. Call initialize() first or wait for autoInitialize.');
      }

      return llm.generate(prompt, opts);
    },
    [llm, isReady]
  );

  return {
    llm,
    isReady,
    isInitializing,
    progress,
    error,
    initialize,
    generate,
  };
}
