'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface LocalModelInfo {
  hasOllama: boolean;
  modelCount: number;
  models: Array<{
    name: string;
    size: string;
    speed: string;
    isBestForJSON: boolean;
    info: string;
  }>;
  recommendedModel: {
    name: string;
    info: string;
  } | null;
}

/**
 * Componente que muestra información sobre modelos locales disponibles
 * Aparece como un banner informativo en el generador de cursos
 */
export function LocalModelInfo() {
  const [modelInfo, setModelInfo] = useState<LocalModelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function detectModels() {
      try {
        const response = await fetch('/api/courses/detect-models');
        if (response.ok) {
          const data = await response.json();
          setModelInfo({
            hasOllama: data.hasOllama,
            modelCount: data.modelCount || 0,
            models: data.models || [],
            recommendedModel: data.recommendedModel
          });
        }
      } catch (error) {
        console.warn('[LocalModelInfo] Detection failed:', error);
      } finally {
        setIsLoading(false);
      }
    }

    detectModels();
  }, []);

  if (isLoading || !modelInfo) {
    return null;
  }

  // No Ollama
  if (!modelInfo.hasOllama) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-lg border border-amber-500/30 bg-amber-900/20 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="text-lg">🏠</div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-200">Local AI Models Not Found</h3>
            <p className="mt-1 text-sm text-amber-300/90">
              Install Ollama to generate unlimited courses with zero API costs!
            </p>
            <ul className="mt-2 text-xs text-amber-300/80 space-y-1 ml-4">
              <li>✓ Free open source</li>
              <li>✓ Private (no cloud)</li>
              <li>✓ Works offline</li>
              <li>✓ Unlimited usage</li>
            </ul>
            <a
              href="https://ollama.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs font-semibold text-amber-400 hover:text-amber-300 underline"
            >
              Download Ollama →
            </a>
          </div>
        </div>
      </motion.div>
    );
  }

  // Ollama running but no models
  if (modelInfo.modelCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-lg border border-blue-500/30 bg-blue-900/20 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="text-lg">📦</div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-200">Ollama Running - No Models</h3>
            <p className="mt-1 text-sm text-blue-300/90">
              Pull a model to start generating courses instantly:
            </p>
            <code className="mt-2 block bg-black/40 rounded p-2 text-xs text-blue-300 font-mono">
              ollama pull neural-chat:latest
            </code>
          </div>
        </div>
      </motion.div>
    );
  }

  // Models available
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-lg border border-green-500/30 bg-green-900/20 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="text-lg">✨</div>
        <div className="flex-1">
          <h3 className="font-semibold text-green-200">
            {modelInfo.modelCount} Local AI Model{modelInfo.modelCount !== 1 ? 's' : ''} Ready
          </h3>
          <p className="mt-1 text-sm text-green-300/90">
            Generate courses with ZERO API costs using your local models!
          </p>

          {modelInfo.recommendedModel && (
            <div className="mt-3 rounded bg-green-900/40 p-2 border border-green-500/20">
              <p className="text-xs font-semibold text-green-300">🎯 Recommended:</p>
              <p className="text-xs text-green-300/80 font-mono mt-1">
                {modelInfo.recommendedModel.name}
              </p>
              <p className="text-xs text-green-300/70 mt-1">
                {modelInfo.recommendedModel.info}
              </p>
            </div>
          )}

          <p className="mt-2 text-xs text-green-300/70">
            👉 Click &quot;Generate&quot; to create your first course right now!
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default LocalModelInfo;
