'use client';

import { useState, useEffect } from 'react';

interface LocalModel {
  name: string;
  size: string;
  speed: string;
  isBestForJSON: boolean;
  contextLength?: number;
  info: string;
}

interface ModelDetectionState {
  loading: boolean;
  hasOllama: boolean;
  models: LocalModel[];
  recommendedModel: LocalModel | null;
  instructions?: string;
  error?: string;
}

/**
 * Component to detect and display local AI models
 * Shows available Ollama models and allows selection
 */
export function LocalModelDetector() {
  const [state, setstate] = useState<ModelDetectionState>({
    loading: true,
    hasOllama: false,
    models: [],
    recommendedModel: null
  });

  useEffect(() => {
    detectModels();
  }, []);

  async function detectModels() {
    try {
      const response = await fetch('/api/courses/detect-models');
      const data = await response.json();

      setstate({
        loading: false,
        hasOllama: data.hasOllama,
        models: data.models || [],
        recommendedModel: data.recommendedModel,
        instructions: data.instructions,
        error: data.success === false ? data.error : undefined
      });
    } catch (error) {
      setstate({
        loading: false,
        hasOllama: false,
        models: [],
        recommendedModel: null,
        error: error instanceof Error ? error.message : 'Detection failed'
      });
    }
  }

  if (state.loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
        <span>Detecting local models...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
        <p className="text-red-200 font-semibold">Detection Error</p>
        <p className="text-red-300 text-sm mt-1">{state.error}</p>
      </div>
    );
  }

  if (!state.hasOllama) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-200 font-semibold mb-2">🏠 Ollama Not Detected</p>
        <p className="text-yellow-300 text-sm mb-3">
          Local AI models are not available. Install Ollama to use powerful local models for free!
        </p>
        {state.instructions && (
          <pre className="bg-black/40 rounded p-3 text-xs text-gray-300 overflow-auto max-h-40 whitespace-pre-wrap">
            {state.instructions}
          </pre>
        )}
      </div>
    );
  }

  if (state.models.length === 0) {
    return (
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <p className="text-blue-200 font-semibold mb-2">📦 No Models Found</p>
        <p className="text-blue-300 text-sm mb-3">
          Ollama is running but no models are installed. Pull a model to get started:
        </p>
        {state.instructions && (
          <pre className="bg-black/40 rounded p-3 text-xs text-gray-300 overflow-auto max-h-40 whitespace-pre-wrap">
            {state.instructions}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
        <p className="text-green-200 font-semibold mb-2">✅ Ollama Detected</p>
        <p className="text-green-300 text-sm">
          {state.models.length} local model{state.models.length !== 1 ? 's' : ''} available for zero-cost course generation!
        </p>
      </div>

      {state.recommendedModel && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
          <p className="text-primary font-semibold mb-2">🎯 Recommended</p>
          <div className="text-sm space-y-1">
            <p className="font-mono">{state.recommendedModel.name}</p>
            <p className="text-gray-400">{state.recommendedModel.info}</p>
          </div>
        </div>
      )}

      {state.models.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Available Models:</p>
          <div className="grid gap-2">
            {state.models.map((model) => (
              <div
                key={model.name}
                className="flex items-start justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex-1">
                  <p className="font-mono text-sm text-white">{model.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{model.info}</p>
                </div>
                {model.isBestForJSON && (
                  <span className="ml-2 px-2 py-1 bg-primary/30 text-primary text-xs rounded-full flex-shrink-0">
                    ✨ JSON
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LocalModelDetector;
