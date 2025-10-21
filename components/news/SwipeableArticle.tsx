"use client";

import { useState } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useHapticFeedback } from '@/lib/hooks/useSwipeGesture';
import Image from 'next/image';

interface SwipeableArticleProps {
  article: {
    id: string;
    title_en: string;
    title_es: string;
    summary_en: string;
    summary_es: string;
    image_url: string;
    category: string;
    published_at: string;
    quality_score: number;
    ai_generated: boolean;
    reading_time_minutes: number;
  };
  locale: 'en' | 'es';
  nextArticleId?: string;
  prevArticleId?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function SwipeableArticle({
  article,
  locale,
  nextArticleId,
  prevArticleId,
  onSwipeLeft,
  onSwipeRight
}: SwipeableArticleProps) {
  const router = useRouter();
  const haptic = useHapticFeedback();
  const [isSwipingAway, setIsSwipingAway] = useState(false);

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-200, 0, 200], [0.9, 1, 0.9]);
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 150;
    const velocity = Math.abs(info.velocity.x);

    if (Math.abs(info.offset.x) > threshold || velocity > 500) {
      if (info.offset.x > 0) {
        // Swipe right - go to previous article
        if (prevArticleId) {
          haptic.success();
          setIsSwipingAway(true);
          setTimeout(() => {
            router.push(`/${locale}/news/${prevArticleId}`);
          }, 300);
        } else {
          haptic.error();
          // Bounce back
          x.set(0);
        }
        onSwipeRight?.();
      } else {
        // Swipe left - go to next article
        if (nextArticleId) {
          haptic.success();
          setIsSwipingAway(true);
          setTimeout(() => {
            router.push(`/${locale}/news/${nextArticleId}`);
          }, 300);
        } else {
          haptic.error();
          // Bounce back
          x.set(0);
        }
        onSwipeLeft?.();
      }
    } else {
      // Bounce back
      x.set(0);
    }
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    
    // Light haptic feedback when crossing threshold
    if (Math.abs(info.offset.x) > threshold && Math.abs(info.offset.x) < threshold + 10) {
      haptic.light();
    }
  };

  return (
    <div className="relative">
      {/* Swipe indicators */}
      <motion.div
        className="pointer-events-none absolute left-8 top-1/2 z-0 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-green-500/20 backdrop-blur-sm"
        style={{ opacity: useTransform(x, [0, 150], [0, 1]) }}
      >
        <svg className="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </motion.div>

      <motion.div
        className="pointer-events-none absolute right-8 top-1/2 z-0 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-blue-500/20 backdrop-blur-sm"
        style={{ opacity: useTransform(x, [-150, 0], [1, 0]) }}
      >
        <svg className="h-8 w-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </motion.div>

      {/* Swipeable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x, opacity, scale, rotate }}
        className="relative z-10 cursor-grab active:cursor-grabbing"
        whileTap={{ cursor: 'grabbing' }}
      >
        <div className="glass overflow-hidden rounded-3xl border-white/10 p-6 shadow-xl">
          <div className="relative mb-4 aspect-video overflow-hidden rounded-2xl">
            <Image 
              src={article.image_url} 
              alt={article[`title_${locale}`]} 
              fill
              className="object-cover"
            />
          </div>
          <span className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {article.category}
          </span>
          <h3 className="mb-2 text-xl font-bold text-white">
            {article[`title_${locale}`]}
          </h3>
          <p className="mb-4 text-sm text-white/70 line-clamp-3">
            {article[`summary_${locale}`]}
          </p>
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span>{article.reading_time_minutes} min</span>
            <span>•</span>
            <span>{Math.round(article.quality_score * 100)}%</span>
          </div>
        </div>
      </motion.div>

      {/* Navigation hints */}
      {!isSwipingAway && (
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          {prevArticleId && (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {locale === 'en' ? 'Swipe right for previous' : 'Desliza a la derecha para anterior'}
            </span>
          )}
          {nextArticleId && (
            <span className="flex items-center gap-2">
              {locale === 'en' ? 'Swipe left for next' : 'Desliza a la izquierda para siguiente'}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
