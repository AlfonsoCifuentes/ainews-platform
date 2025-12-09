'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImageOff, RefreshCw, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useModuleVisualSlots } from '@/hooks/use-module-visual-slots';
import { useUser } from '@/lib/hooks/useUser';
import { normalizeVisualStyle, type VisualStyle } from '@/lib/types/illustrations';

const VARIANT_STYLES: VisualStyle[] = ['photorealistic', 'anime'];

interface ModuleHeaderIllustrationProps {
  moduleId: string;
  courseTitle: string;
  moduleTitle: string;
  locale: 'en' | 'es';
  className?: string;
  visualStyleOverride?: VisualStyle;
  frameless?: boolean;
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
  visualStyleOverride,
  frameless = false,
}: ModuleHeaderIllustrationProps) {
  const { profile } = useUser();
  const { slots: headerSlots, loading: slotsLoading, refresh } = useModuleVisualSlots(moduleId, locale, {
    slotType: 'header',
    limit: 1,
  });
  const headerSlot = headerSlots[0] ?? null;
  const [state, setState] = useState<IllustrationState>({ loading: true, error: null, imageUrl: null });
  const [requestNonce, setRequestNonce] = useState(0);

  const resolvedVisualStyle: VisualStyle = useMemo(() => {
    return normalizeVisualStyle(
      visualStyleOverride ?? headerSlot?.suggestedVisualStyle ?? profile?.preferred_visual_style ?? null
    );
  }, [visualStyleOverride, headerSlot?.suggestedVisualStyle, profile?.preferred_visual_style]);

  const cacheKey = useMemo(
    () => `module_header_${moduleId}_${locale}_${resolvedVisualStyle}_${headerSlot?.id ?? 'default'}`,
    [moduleId, locale, resolvedVisualStyle, headerSlot?.id]
  );

  const generationContent = useMemo(() => {
    if (!headerSlot) {
      return `${courseTitle}: ${moduleTitle}`;
    }

    const details = [headerSlot.summary, headerSlot.reason, `${courseTitle}: ${moduleTitle}`]
      .filter(Boolean)
      .join('\n\n');
    return details || `${courseTitle}: ${moduleTitle}`;
  }, [headerSlot, courseTitle, moduleTitle]);

  useEffect(() => {
    if (!moduleId) return;
    if (slotsLoading && !headerSlot) return;

    let cancelled = false;

    const hydrateFromCache = (): string | null => {
      try {
        const raw = localStorage.getItem(cacheKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { imageUrl: string; timestamp: number };
        const week = 7 * 24 * 60 * 60 * 1000;
        if (parsed.imageUrl && Date.now() - parsed.timestamp < week) {
          return parsed.imageUrl;
        }
      } catch {
        return null;
      }
      return null;
    };

    const persistCache = (imageUrl: string) => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ imageUrl, timestamp: Date.now() }));
      } catch {
        // Ignore quota errors
      }
    };

    const fetchStoredIllustration = async (): Promise<string | null> => {
      try {
        const params = new URLSearchParams({
          moduleId,
          locale,
          style: 'header',
          visualStyle: resolvedVisualStyle,
        });
        if (headerSlot?.id) {
          params.set('slotId', headerSlot.id);
        }

        const existing = await fetch(`/api/courses/modules/illustrations?${params.toString()}`);
        if (!existing.ok) return null;
        const payload = (await existing.json()) as {
          success: boolean;
          illustration?: { image_url: string | null } | null;
        };

        if (payload.success && payload.illustration?.image_url) {
          return payload.illustration.image_url;
        }
      } catch (error) {
        console.warn('[ModuleHeaderIllustration] Prefetch failed', error);
      }
      return null;
    };

    const fetchOrGenerate = async () => {
      setState({ loading: true, error: null, imageUrl: null });

      const cached = hydrateFromCache();
      if (cached) {
        if (!cancelled) {
          setState({ loading: false, error: null, imageUrl: cached });
        }
        return;
      }

      const storedUrl = await fetchStoredIllustration();
      if (storedUrl) {
        persistCache(storedUrl);
        if (!cancelled) {
          setState({ loading: false, error: null, imageUrl: storedUrl });
        }
        return;
      }

      try {
        const response = await fetch('/api/courses/modules/generate-illustration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: generationContent,
            locale,
            style: 'header',
            moduleId,
            visualStyle: resolvedVisualStyle,
            variants: VARIANT_STYLES,
            slotId: headerSlot?.id,
            anchor: headerSlot
              ? {
                  slotType: headerSlot.slotType,
                  blockIndex: headerSlot.blockIndex,
                  heading: headerSlot.heading,
                }
              : undefined,
            metadata: headerSlot
              ? {
                  reason: headerSlot.reason,
                  summary: headerSlot.summary,
                  confidence: headerSlot.confidence,
                }
              : undefined,
          }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Generation failed');
        }

        const variants = (data.variants ?? []) as Array<{ visualStyle: string; url?: string | null }>;
        const preferred = variants.find((entry) => entry.visualStyle === resolvedVisualStyle) ?? variants[0] ?? data.primary;
        const imageUrl = preferred?.url ?? data.primary?.url ?? null;

        if (!imageUrl) {
          throw new Error('No image returned by cascade');
        }

        persistCache(imageUrl);
        if (!cancelled) {
          setState({ loading: false, error: null, imageUrl });
        }
      } catch (error) {
        console.error('[ModuleHeaderIllustration] Generation failed', error);
        if (!cancelled) {
          setState({ loading: false, error: 'Failed to generate illustration', imageUrl: null });
        }
      }
    };

    void fetchOrGenerate();

    return () => {
      cancelled = true;
    };
  }, [
    moduleId,
    locale,
    resolvedVisualStyle,
    cacheKey,
    generationContent,
    headerSlot,
    slotsLoading,
    requestNonce,
  ]);

  const handleRetry = () => {
    try {
      localStorage.removeItem(cacheKey);
    } catch {
      // Ignore cache errors
    }
    setRequestNonce((value) => value + 1);
    refresh();
  };

  const wrapperClassName = [
    'relative overflow-hidden',
    frameless ? '' : 'rounded-3xl',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClassName}>
      <AnimatePresence mode="wait">
        {state.loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full min-h-[200px] bg-[#020309]"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-3 border-white/20 border-t-white/60 animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-white/60 animate-pulse" />
            </div>
            <p className="mt-3 text-xs text-white/50 uppercase tracking-wider">
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
            className="flex flex-col items-center justify-center h-full min-h-[200px] bg-[#020309]"
          >
            <ImageOff className="w-10 h-10 text-white/30 mb-3" />
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/60 text-sm hover:bg-white/20 transition-colors"
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
