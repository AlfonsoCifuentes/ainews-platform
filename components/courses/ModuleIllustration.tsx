'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import type { IllustrationStyle } from '@/lib/ai/gemini-image';
import { normalizeVisualStyle, type VisualStyle } from '@/lib/types/illustrations';
import type { ModuleVisualSlot } from '@/lib/types/visual-slots';

const VARIANT_STYLES: VisualStyle[] = ['photorealistic', 'anime'];

interface ModuleIllustrationProps {
  moduleId: string;
  content: string;
  locale: 'en' | 'es';
  style?: IllustrationStyle;
  visualStyle?: VisualStyle;
  slot?: ModuleVisualSlot | null;
  autoGenerate?: boolean;
  className?: string;
}

type LoadingState = 'idle' | 'fetching' | 'generating';

interface IllustrationMeta {
  provider?: string | null;
  model?: string | null;
  updatedAt?: string | null;
}

export function ModuleIllustration({
  moduleId,
  content,
  locale,
  style = 'textbook',
  visualStyle,
  slot,
  autoGenerate = true,
  className = '',
}: ModuleIllustrationProps) {
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [meta, setMeta] = useState<IllustrationMeta | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [shouldAutoGenerate, setShouldAutoGenerate] = useState(false);
  const [autoAttempts, setAutoAttempts] = useState(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxAutoAttempts = autoGenerate ? 1 : 0;

  const slotSuggestedStyle = slot?.suggestedVisualStyle;

  const resolvedVisualStyle = useMemo<VisualStyle>(
    () => normalizeVisualStyle(visualStyle ?? slotSuggestedStyle ?? null),
    [visualStyle, slotSuggestedStyle]
  );

  const generationContent = useMemo(() => {
    if (!slot) return content;
    const sections = [slot.heading, slot.summary, slot.reason, content]
      .filter(Boolean)
      .join('\n\n');
    return sections || content;
  }, [slot, content]);

  const slotContext = useMemo(() => {
    if (!slot) return null;
    const labels = {
      en: {
        header: 'Hero slot',
        diagram: 'Diagram slot',
        inline: 'Inline slot',
      },
      es: {
        header: 'Slot hero',
        diagram: 'Slot diagrama',
        inline: 'Slot inline',
      },
    } as const;
    return labels[locale][slot.slotType];
  }, [slot, locale]);

  const t = useMemo(() => (
    locale === 'en'
      ? {
          poweredBy: 'AI Illustration Pipeline',
          generating: 'Generating via cascade...',
          fetching: 'Loading stored illustration...',
          error: 'Failed to load illustration',
          missing: 'No illustration available yet',
          slotInsight: 'Visual slot insight',
          slotReason: 'Why this matters',
          updated: 'Updated',
        }
      : {
          poweredBy: 'Canal de Ilustraciones IA',
          generating: 'Generando con la cascada...',
          fetching: 'Cargando ilustración guardada...',
          error: 'No se pudo cargar la ilustración',
          missing: 'Aún no hay ilustración',
          slotInsight: 'Slot visual recomendado',
          slotReason: 'Por qué importa',
          updated: 'Actualizado',
        }
  ), [locale]);

  useEffect(() => {
    setImageSource(null);
    setMeta(null);
    setError(null);
    setShouldAutoGenerate(false);
    setAutoAttempts(0);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [moduleId, locale, style, resolvedVisualStyle, slot?.id]);

  useEffect(() => () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    async function loadExisting() {
      if (!moduleId) return;
      setLoadingState('fetching');
      setError(null);

      try {
        const params = new URLSearchParams({
          moduleId,
          locale,
          style,
          visualStyle: resolvedVisualStyle,
        });

        const response = await fetch(`/api/courses/modules/illustrations?${params.toString()}`, {
          method: 'GET',
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(body || 'Failed to fetch illustration');
        }

        const payload = await response.json() as {
          success: boolean;
          illustration?: {
            image_url: string;
            provider?: string | null;
            model?: string | null;
            created_at?: string | null;
          } | null;
        };

        if (!isActive) return;

        if (payload.success && payload.illustration) {
          setImageSource(payload.illustration.image_url);
          setMeta({
            provider: payload.illustration.provider,
            model: payload.illustration.model,
            updatedAt: payload.illustration.created_at,
          });
          setShouldAutoGenerate(false);
        } else {
          setImageSource(null);
          setMeta(null);
          if (autoGenerate && maxAutoAttempts > 0) {
            setShouldAutoGenerate(true);
          }
        }
      } catch (err) {
        if (!isActive) return;
        console.error('[ModuleIllustration] Fetch failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (isActive) {
          setLoadingState('idle');
        }
      }
    }

    void loadExisting();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [moduleId, locale, style, resolvedVisualStyle, autoGenerate, maxAutoAttempts, slot?.id]);

  const handleGenerate = useCallback(async (triggeredAutomatically = false) => {
    if (!moduleId) return;
    setLoadingState('generating');
    setError(null);

    try {
      const response = await fetch('/api/courses/modules/generate-illustration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: generationContent,
          locale,
          style,
          moduleId,
          visualStyle: resolvedVisualStyle,
          variants: VARIANT_STYLES,
          slotId: slot?.id,
          anchor: slot
            ? {
                slotType: slot.slotType,
                blockIndex: slot.blockIndex,
                heading: slot.heading,
              }
            : undefined,
          metadata: slot
            ? {
                slotType: slot.slotType,
                density: slot.density,
                summary: slot.summary,
                reason: slot.reason,
                confidence: slot.confidence,
              }
            : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      const variants = (data.variants ?? []) as Array<{ visualStyle: string; url?: string | null; mimeType?: string; model?: string | null; provider?: string | null; persisted?: { created_at?: string | null } }>;
      const preferred = variants.find((entry) => entry.visualStyle === resolvedVisualStyle) ?? variants[0];

      if (!preferred?.url && !data.primary?.url) {
        throw new Error('No image returned');
      }

      const finalUrl = preferred?.url ?? data.primary?.url;
      setImageSource(finalUrl ?? null);
      setMeta({
        provider: preferred?.provider ?? data.provider ?? null,
        model: preferred?.model ?? data.model ?? null,
        updatedAt: preferred?.persisted?.created_at ?? data.primary?.persisted?.created_at ?? new Date().toISOString(),
      });
    } catch (err) {
      console.error('[ModuleIllustration] Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      if (triggeredAutomatically && autoGenerate && maxAutoAttempts > 0) {
        retryTimeoutRef.current = setTimeout(() => {
          setShouldAutoGenerate(true);
        }, 4000);
      }
    } finally {
      setLoadingState('idle');
    }
  }, [moduleId, generationContent, locale, style, resolvedVisualStyle, slot, autoGenerate, maxAutoAttempts]);

  useEffect(() => {
    if (!autoGenerate) return;
    if (!shouldAutoGenerate) return;
    if (autoAttempts >= maxAutoAttempts) return;
    setShouldAutoGenerate(false);
    setAutoAttempts((value) => value + 1);
    void handleGenerate(true);
  }, [autoGenerate, shouldAutoGenerate, autoAttempts, maxAutoAttempts, handleGenerate]);

  const statusLabel = useMemo(() => {
    if (loadingState === 'generating') return t.generating;
    if (loadingState === 'fetching') return t.fetching;
    if (error) return t.error;
    if (!imageSource) return t.missing;
    return null;
  }, [loadingState, t, error, imageSource]);

  const metaDescription = useMemo(() => {
    if (!meta?.updatedAt) return null;
    try {
      return `${t.updated} ${formatDistanceToNow(new Date(meta.updatedAt), { addSuffix: true })}`;
    } catch {
      return `${t.updated} ${meta.updatedAt}`;
    }
  }, [meta?.updatedAt, t.updated]);

  return (
    <div className={cn('rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/30 to-slate-950/50 p-6', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-blue-300">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">{t.poweredBy}</span>
          </div>
          <p className="text-xs text-blue-200/70">
            {style} • {resolvedVisualStyle}
          </p>
        </div>
        {metaDescription && (
          <span className="text-[11px] uppercase tracking-[0.4em] text-blue-200/70">{metaDescription}</span>
        )}
      </div>

      {slot && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-blue-200/70">
            <span>{t.slotInsight}</span>
            {slotContext && <Badge variant="outline" className="!text-white/80">{slotContext}</Badge>}
          </div>
          {slot.heading && <p className="mt-3 text-sm font-semibold text-white">{slot.heading}</p>}
          {slot.summary && <p className="mt-2 text-sm text-white/80">{slot.summary}</p>}
          {slot.reason && (
            <p className="mt-3 text-xs text-white/60">
              <span className="font-semibold uppercase tracking-widest text-white/70">{t.slotReason}: </span>
              {slot.reason}
            </p>
          )}
        </div>
      )}

      <div className="mt-6">
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <AnimatePresence mode="wait">
            {loadingState !== 'idle' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white"
              >
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm text-blue-100/80">{statusLabel}</p>
              </motion.div>
            )}

            {error && loadingState === 'idle' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-center text-white"
              >
                <AlertCircle className="h-10 w-10 text-red-300" />
                <p className="text-sm text-red-100/90">{t.error}</p>
                <p className="text-xs text-white/70 max-w-xs">{error}</p>
                {autoGenerate && (
                  <p className="text-[11px] uppercase tracking-[0.4em] text-white/60">
                    {locale === 'en' ? 'Auto-retrying shortly…' : 'Reintentando automáticamente…'}
                  </p>
                )}
              </motion.div>
            )}

            {!imageSource && !error && loadingState === 'idle' && (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-blue-100/70"
              >
                <ImageIcon className="h-10 w-10" />
                <p className="text-sm text-center px-6">{t.missing}</p>
              </motion.div>
            )}

            {imageSource && !error && (
              <motion.div
                key="image"
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <Image
                  src={imageSource}
                  alt={slot?.heading || 'AI-generated educational illustration'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 600px"
                  unoptimized={imageSource.startsWith('data:')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2 text-xs text-white/80">
                  {meta?.provider && <Badge variant="outline" className="bg-black/40 text-white/80 border-white/30">{meta.provider}</Badge>}
                  {meta?.model && <Badge variant="outline" className="bg-black/40 text-white/80 border-white/30">{meta.model}</Badge>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
