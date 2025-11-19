/**
 * Hook para diagnosticar y trackear el componente AILeaderboardPodium
 */
'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/utils/logging';

export function useLeaderboardDiagnostics() {
  useEffect(() => {
    logger.info('AILeaderboard', 'Component mounted and rendered successfully');

    return () => {
      logger.info('AILeaderboard', 'Component unmounted');
    };
  }, []);

  // Track when data is being fetched
  useEffect(() => {
    logger.debug('AILeaderboard', 'useLeaderboardDiagnostics hook initialized');
  }, []);
}

/**
 * Hook para trackear el estado de carga de imágenes
 */
export function useImageDiagnostics(src: string, alt: string) {
  useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      logger.debug('Image-Load', `Image loaded: ${alt}`, { src });
    };
    
    img.onerror = () => {
      logger.error('Image-Error', `Failed to load image: ${alt}`, { src });
    };
    
    img.src = src;
  }, [src, alt]);
}
