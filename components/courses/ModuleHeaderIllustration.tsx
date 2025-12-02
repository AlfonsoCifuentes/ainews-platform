'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, ImageOff } from 'lucide-react';
import Image from 'next/image';

interface ModuleHeaderIllustrationProps {
  moduleId: string;
  courseTitle: string;
  moduleTitle: string;
  locale: 'en' | 'es';
  className?: string;
}

interface IllustrationState {
  loading: boolean;
  error: string | null;
  imageUrl: string | null;
}

export function ModuleHeaderIllustration({
  moduleId,
  courseTitle,
  moduleTitle,
  locale,
  className = '',
}: ModuleHeaderIllustrationProps) {
  const [state, setState] = useState<IllustrationState>({
    loading: true,
    error: null,
    imageUrl: null,
  });

  useEffect(() => {
    const cacheKey = `header_illustration_${moduleId}`;
    
    // Check cache first
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.imageUrl && Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) { // 7 days cache
          setState({ loading: false, error: null, imageUrl: parsed.imageUrl });
          return;
        }
      } catch {
        // Invalid cache, proceed with generation
      }
    }

    // Generate illustration
    const generateIllustration = async () => {
      try {
        const response = await fetch('/api/courses/modules/generate-illustration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `${courseTitle}: ${moduleTitle}`,
            locale,
            style: 'header',
            moduleId,
          }),
        });

        const data = await response.json();

        if (data.success && data.image?.data) {
          const imageUrl = `data:${data.image.mimeType};base64,${data.image.data}`;
          
          // Cache the result
          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              imageUrl,
              timestamp: Date.now(),
            }));
          } catch {
            // Storage full, ignore
          }

          setState({ loading: false, error: null, imageUrl });
        } else {
          throw new Error(data.error || 'Failed to generate');
        }
      } catch (error) {
        console.error('[ModuleHeaderIllustration] Error:', error);
        setState({ loading: false, error: 'Failed to generate illustration', imageUrl: null });
      }
    };

    generateIllustration();
  }, [moduleId, courseTitle, moduleTitle, locale]);

  const handleRetry = () => {
    setState({ loading: true, error: null, imageUrl: null });
    localStorage.removeItem(`header_illustration_${moduleId}`);
    // Trigger re-fetch by updating key
    window.location.reload();
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl ${className}`}>
      <AnimatePresence mode="wait">
        {state.loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full min-h-[200px] bg-gradient-to-br from-blue-950/50 to-slate-950/70"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-3 border-blue-500/30 border-t-blue-500 animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-blue-400 animate-pulse" />
            </div>
            <p className="mt-3 text-xs text-blue-300/70 uppercase tracking-wider">
              {locale === 'en' ? 'Generating illustration...' : 'Generando ilustración...'}
            </p>
          </motion.div>
        )}

        {state.error && !state.loading && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full min-h-[200px] bg-gradient-to-br from-slate-900/80 to-slate-950/90"
          >
            <ImageOff className="w-10 h-10 text-slate-500 mb-3" />
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/20 text-blue-400 text-sm hover:bg-blue-600/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {locale === 'en' ? 'Retry' : 'Reintentar'}
            </button>
          </motion.div>
        )}

        {state.imageUrl && !state.loading && (
          <motion.div
            key="image"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full h-full min-h-[200px]"
          >
            <Image
              src={state.imageUrl}
              alt={moduleTitle}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
              unoptimized // Since it's a data URL
            />
            {/* Overlay gradient for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* AI Generated badge */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-[10px] text-white/70">
              <Sparkles className="w-3 h-3" />
              <span>AI Generated</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
