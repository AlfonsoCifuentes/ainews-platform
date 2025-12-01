'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModuleIllustrationProps {
  moduleId: string;
  content: string;
  locale: 'en' | 'es';
  style?: 'schema' | 'infographic' | 'conceptual' | 'textbook';
  className?: string;
}

interface IllustrationState {
  loading: boolean;
  error: string | null;
  imageData: string | null;
  mimeType: string | null;
  model: string | null;
}

export function ModuleIllustration({
  moduleId,
  content,
  locale,
  style = 'textbook',
  className = '',
}: ModuleIllustrationProps) {
  const [state, setState] = useState<IllustrationState>({
    loading: false,
    error: null,
    imageData: null,
    mimeType: null,
    model: null,
  });
  const [showIllustration, setShowIllustration] = useState(false);

  const t = locale === 'en'
    ? {
        generateIllustration: 'Generate AI Illustration',
        generating: 'Generating with Nano Banana Pro...',
        regenerate: 'Regenerate',
        error: 'Failed to generate illustration',
        poweredBy: 'Powered by Nano Banana Pro',
        showIllustration: 'Show Educational Illustration',
        hideIllustration: 'Hide Illustration',
      }
    : {
        generateIllustration: 'Generar Ilustración IA',
        generating: 'Generando con Nano Banana Pro...',
        regenerate: 'Regenerar',
        error: 'Error al generar ilustración',
        poweredBy: 'Generado con Nano Banana Pro',
        showIllustration: 'Mostrar Ilustración Educativa',
        hideIllustration: 'Ocultar Ilustración',
      };

  const generateIllustration = async () => {
    if (state.loading) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/courses/modules/generate-illustration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          locale,
          style,
          moduleId,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setState({
        loading: false,
        error: null,
        imageData: data.image.data,
        mimeType: data.image.mimeType,
        model: data.model,
      });
      setShowIllustration(true);
    } catch (error) {
      console.error('[ModuleIllustration] Error:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };

  // Auto-generate on mount if content is substantial
  useEffect(() => {
    // Only auto-generate if content is long enough and we don't already have an image
    if (content.length > 500 && !state.imageData && !state.loading && !state.error) {
      // Delay to not block initial render
      const timer = setTimeout(() => {
        // Check localStorage for cached illustration
        const cacheKey = `illustration_${moduleId}_${style}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.imageData && parsed.mimeType) {
              setState({
                loading: false,
                error: null,
                imageData: parsed.imageData,
                mimeType: parsed.mimeType,
                model: parsed.model || 'cached',
              });
              setShowIllustration(true);
            }
          } catch {
            // Invalid cache, proceed with generation
          }
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [moduleId, content.length, style, state.imageData, state.loading, state.error]);

  // Cache generated illustration
  useEffect(() => {
    if (state.imageData && state.mimeType) {
      const cacheKey = `illustration_${moduleId}_${style}`;
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            imageData: state.imageData,
            mimeType: state.mimeType,
            model: state.model,
            timestamp: Date.now(),
          })
        );
      } catch {
        // Storage full or disabled, ignore
      }
    }
  }, [state.imageData, state.mimeType, state.model, moduleId, style]);

  return (
    <div className={`rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/30 to-slate-950/50 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-blue-400">
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">
            {t.poweredBy}
          </span>
        </div>

        {state.imageData && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowIllustration(!showIllustration)}
            className="text-xs"
          >
            {showIllustration ? t.hideIllustration : t.showIllustration}
          </Button>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {!state.imageData && !state.loading && !state.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <ImageIcon className="w-12 h-12 text-blue-400/50 mb-4" />
            <Button
              onClick={generateIllustration}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t.generateIllustration}
            </Button>
          </motion.div>
        )}

        {state.loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-blue-400 animate-pulse" />
            </div>
            <p className="mt-4 text-sm text-blue-300">{t.generating}</p>
          </motion.div>
        )}

        {state.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <AlertCircle className="w-12 h-12 text-red-400/70 mb-4" />
            <p className="text-sm text-red-400 mb-4">{t.error}</p>
            <p className="text-xs text-muted-foreground mb-4">{state.error}</p>
            <Button variant="outline" onClick={generateIllustration}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t.regenerate}
            </Button>
          </motion.div>
        )}

        {state.imageData && showIllustration && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${state.mimeType};base64,${state.imageData}`}
                alt="AI-generated educational illustration"
                className="w-full h-auto"
              />
              
              {/* Overlay badge */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white/80">
                <Sparkles className="w-3 h-3" />
                <span>Nano Banana Pro</span>
              </div>
            </div>

            {/* Regenerate button */}
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={generateIllustration}
                disabled={state.loading}
                className="text-xs"
              >
                <RefreshCw className={`w-3 h-3 mr-2 ${state.loading ? 'animate-spin' : ''}`} />
                {t.regenerate}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
