'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, Download, Zap, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface WebLLMClientProps {
  locale: 'en' | 'es';
  onReady?: () => void;
}

export function WebLLMClient({ locale, onReady }: WebLLMClientProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [engine, setEngine] = useState<any>(null);
  const [modelSize, setModelSize] = useState('0 MB');

  const t = locale === 'en' ? {
    title: 'On-Device AI',
    subtitle: 'Run AI models locally in your browser',
    download: 'Download Model',
    loading: 'Loading model...',
    ready: 'Model Ready',
    notSupported: 'Not Supported',
    benefits: [
      'Complete privacy - data never leaves your device',
      'No API costs - runs entirely in browser',
      'Works offline - no internet required',
      'Low latency - instant responses',
    ],
    requirements: 'Requires modern browser with WebGPU support',
    modelInfo: 'Model: Llama-3.1-8B-Instruct (4-bit quantized)',
    size: 'Size',
    progress: 'Progress',
  } : {
    title: 'IA en el Dispositivo',
    subtitle: 'Ejecuta modelos IA localmente en tu navegador',
    download: 'Descargar Modelo',
    loading: 'Cargando modelo...',
    ready: 'Modelo Listo',
    notSupported: 'No Compatible',
    benefits: [
      'Privacidad total - datos nunca salen del dispositivo',
      'Sin costos API - ejecuta completamente en navegador',
      'Funciona offline - no requiere internet',
      'Baja latencia - respuestas instantáneas',
    ],
    requirements: 'Requiere navegador moderno con soporte WebGPU',
    modelInfo: 'Modelo: Llama-3.1-8B-Instruct (cuantizado 4-bit)',
    size: 'Tamaño',
    progress: 'Progreso',
  };

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    // Check for WebGPU support
    if ('gpu' in navigator) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
    }
  };

  const loadModel = useCallback(async () => {
    setIsLoading(true);
    setProgress(0);

    try {
      // Dynamic import of @mlc-ai/web-llm
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

      // Progress callback
      const initProgressCallback = (report: any) => {
        setProgress(report.progress * 100);
        if (report.text) {
          console.log(report.text);
        }
      };

      // Create engine with Llama-3.1-8B-Instruct
      const mlcEngine = await CreateMLCEngine('Llama-3.1-8B-Instruct-q4f32_1', {
        initProgressCallback,
      });

      setEngine(mlcEngine);
      setIsReady(true);
      setModelSize('4.8 GB');
      onReady?.();
    } catch (error) {
      console.error('Failed to load model:', error);
      setIsReady(false);
    } finally {
      setIsLoading(false);
    }
  }, [onReady]);

  const generate = useCallback(
    async (prompt: string): Promise<string> => {
      if (!engine || !isReady) {
        throw new Error('Model not ready');
      }

      try {
        const response = await engine.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 512,
        });

        return response.choices[0].message.content;
      } catch (error) {
        console.error('Generation error:', error);
        throw error;
      }
    },
    [engine, isReady]
  );

  // Expose generate function to parent via ref or callback
  useEffect(() => {
    if (isReady && typeof window !== 'undefined') {
      (window as any).webLLMGenerate = generate;
    }
  }, [isReady, generate]);

  if (!isSupported) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-orange-500/10 border border-orange-500/30 p-6"
      >
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-8 w-8 text-orange-500 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold mb-2">{t.notSupported}</h3>
            <p className="text-sm text-muted-foreground">{t.requirements}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try Chrome Canary or Edge Dev with WebGPU enabled.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2 mb-1">
            <Brain className="h-6 w-6 text-primary" />
            {t.title}
          </h3>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {isReady && <Lock className="h-5 w-5 text-green-500" />}
        </div>
      </div>

      {/* Model Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white/5">
          <div className="text-xs text-muted-foreground mb-1">{t.modelInfo}</div>
          <div className="text-sm font-mono">{modelSize} {t.size}</div>
        </div>

        {isLoading && (
          <div className="p-4 rounded-xl bg-white/5">
            <div className="text-xs text-muted-foreground mb-2">
              {t.progress}: {Math.round(progress)}%
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </div>

      {/* Benefits */}
      <div className="space-y-2">
        {t.benefits.map((benefit, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-2 text-sm"
          >
            <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <span>{benefit}</span>
          </motion.div>
        ))}
      </div>

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        {!isReady && !isLoading && (
          <Button
            onClick={loadModel}
            size="lg"
            className="gap-2"
          >
            <Download className="h-5 w-5" />
            {t.download}
          </Button>
        )}

        {isLoading && (
          <Button disabled size="lg" className="gap-2">
            <Brain className="h-5 w-5 animate-pulse" />
            {t.loading}
          </Button>
        )}

        {isReady && (
          <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500/20 border border-green-500/30">
            <Lock className="h-5 w-5 text-green-500" />
            <span className="font-semibold text-green-500">{t.ready}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
