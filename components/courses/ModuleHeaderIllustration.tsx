'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImageOff, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useModuleVisualSlots } from '@/hooks/use-module-visual-slots';
import { useUser } from '@/lib/hooks/useUser';
import { normalizeVisualStyle, type VisualStyle } from '@/lib/types/illustrations';

interface ModuleHeaderIllustrationProps {
  moduleId: string;
  courseTitle: string;
  moduleTitle: string;
  locale: 'en' | 'es';
  className?: string;
  visualStyleOverride?: VisualStyle;
  frameless?: boolean;
  fallbackImageUrl?: string | null;
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
  fallbackImageUrl,
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
    // If we already have a reliable fallback (course cover), prefer it and skip generation entirely.
    if (fallbackImageUrl) {
      setState({ loading: false, error: null, imageUrl: null });
      return;
    }

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

      // Never generate images on page view. Images must be created at course creation time.
      if (!cancelled) {
        setState({
          loading: false,
          error: locale === 'en' ? 'No illustration available yet' : 'Aún no hay ilustración disponible',
          imageUrl: null,
        });
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
    fallbackImageUrl,
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

  // Determine which image to show: module illustration, fallback, or none
  const displayImageUrl = fallbackImageUrl || state.imageUrl;

  return (
    <div className={wrapperClassName} style={{ backgroundColor: '#020309' }}>
      {/* Always show image if available (either module illustration or fallback) */}
      {displayImageUrl && (
        <div className="absolute inset-0">
          <Image
            src={displayImageUrl}
            alt={moduleTitle}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 100vw"
            priority
          />
        </div>
      )}
      
      <AnimatePresence mode="wait">
        {state.loading && !displayImageUrl && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center h-full min-h-[200px]"
            style={{ backgroundColor: '#020309' }}
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
            </div>
            <p className="mt-3 text-xs text-white/40 uppercase tracking-wider">
              {locale === 'en' ? 'Loading...' : 'Cargando...'}
            </p>
          </motion.div>
        )}

        {state.error && !state.loading && !displayImageUrl && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center h-full min-h-[200px]"
            style={{ backgroundColor: '#020309' }}
          >
            <ImageOff className="w-10 h-10 text-white/20 mb-3" />
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/50 text-sm hover:bg-white/20 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {locale === 'en' ? 'Retry' : 'Reintentar'}
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
