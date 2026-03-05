/**
 * Hook para diagnosticar y trackear el componente AILeaderboardPodium
 * Only active in development — no-ops in production.
 */
'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/utils/logging';

const isDev = process.env.NODE_ENV === 'development';

export function useLeaderboardDiagnostics() {
  useEffect(() => {
    if (!isDev) return;
    logger.info('AILeaderboard', 'Component mounted and rendered successfully');

    return () => {
      logger.info('AILeaderboard', 'Component unmounted');
    };
  }, []);

  useEffect(() => {
    if (!isDev) return;
    logger.debug('AILeaderboard', 'useLeaderboardDiagnostics hook initialized');
  }, []);
}

/**
 * Hook para trackear el estado de carga de imágenes.
 * Only active in development — no-ops in production.
 */
export function useImageDiagnostics(src: string, alt: string) {
  useEffect(() => {
    if (!isDev) return;

    const img = new Image();
    
    img.onload = () => {
      logger.debug('Image-Load', `Image loaded: ${alt}`, { src });
    };
    
    img.onerror = () => {
      logger.error('Image-Error', `Failed to load image: ${alt}`, { src });
    };
    
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
    };
  }, [src, alt]);
}
