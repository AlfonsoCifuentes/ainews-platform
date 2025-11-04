/**
 * Advanced Image Lazy Loading with Intersection Observer
 * 
 * Provides progressive image loading with blur-up effect, 
 * responsive srcset, and performance optimizations.
 * 
 * Features:
 * - Intersection Observer for viewport detection
 * - Blur-up placeholder technique
 * - Responsive image loading (srcset)
 * - Loading states and error handling
 * - Performance monitoring
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  blurDataURL?: string;
  srcSet?: string;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  rootMargin?: string;
  threshold?: number;
}

/**
 * LazyImage Component
 * 
 * Advanced lazy loading image with blur-up effect and Intersection Observer
 * 
 * @example
 * <LazyImage
 *   src="/images/article.jpg"
 *   alt="Article cover"
 *   width={800}
 *   height={450}
 *   blurDataURL="data:image/jpeg;base64,..."
 *   srcSet="/images/article-400.jpg 400w, /images/article-800.jpg 800w"
 *   sizes="(max-width: 768px) 100vw, 800px"
 * />
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  className,
  blurDataURL,
  srcSet,
  sizes,
  priority = false,
  onLoad,
  onError,
  rootMargin = '50px',
  threshold = 0.01,
}: LazyImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [error, setError] = useState<Error | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [priority, rootMargin, threshold]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    const err = new Error(`Failed to load image: ${src}`);
    setError(err);
    onError?.(err);
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        className
      )}
      style={{
        aspectRatio: width && height ? `${width} / ${height}` : undefined,
      }}
    >
      {/* Blur placeholder */}
      {blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={isInView ? src : undefined}
        srcSet={isInView ? srcSet : undefined}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-500',
          isLoaded ? 'opacity-100' : 'opacity-0',
          error && 'hidden'
        )}
      />

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center text-muted-foreground">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      )}

      {/* Loading spinner */}
      {!isLoaded && !error && isInView && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

/**
 * Generate blur data URL from image
 * Server-side only
 */
export async function generateBlurDataURL(imageUrl: string): Promise<string | undefined> {
  if (typeof window !== 'undefined') {
    throw new Error('generateBlurDataURL is server-side only');
  }

  try {
    // Dynamic import sharp (server-side only)
    const sharp = (await import('sharp')).default;
    
    // Fetch image
    const response = await fetch(imageUrl);
    if (!response.ok) return undefined;
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate tiny blur placeholder (10px width)
    const blurBuffer = await sharp(buffer)
      .resize(10)
      .jpeg({ quality: 50 })
      .toBuffer();

    // Convert to base64 data URL
    const base64 = blurBuffer.toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('[generateBlurDataURL] Error:', error);
    return undefined;
  }
}

/**
 * Generate responsive srcset from image URL
 * 
 * @example
 * const srcSet = generateSrcSet('/images/article.jpg', [400, 800, 1200]);
 * // Returns: "/images/article-400.jpg 400w, /images/article-800.jpg 800w, ..."
 */
export function generateSrcSet(baseUrl: string, widths: number[]): string {
  return widths
    .map((width) => {
      const url = baseUrl.replace(/\.(jpg|jpeg|png|webp)$/, `-${width}.$1`);
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Generate sizes attribute for responsive images
 * 
 * @example
 * const sizes = generateSizes([
 *   { breakpoint: 768, size: '100vw' },
 *   { breakpoint: 1024, size: '50vw' },
 *   { size: '800px' }
 * ]);
 * // Returns: "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 800px"
 */
export function generateSizes(
  config: Array<{ breakpoint?: number; size: string }>
): string {
  return config
    .map(({ breakpoint, size }) => {
      if (breakpoint) {
        return `(max-width: ${breakpoint}px) ${size}`;
      }
      return size;
    })
    .join(', ');
}

/**
 * Preload critical images for better LCP
 * Call this in the <head> for above-the-fold images
 * 
 * @example
 * // In app/layout.tsx or page.tsx
 * <head>
 *   {preloadImage('/hero.jpg', { as: 'image', type: 'image/jpeg' })}
 * </head>
 */
export function preloadImage(
  href: string,
  options: {
    as?: 'image' | 'fetch';
    type?: string;
    imageSrcSet?: string;
    imageSizes?: string;
  } = {}
): React.ReactNode {
  const { as = 'image', type, imageSrcSet, imageSizes } = options;

  return (
    <link
      key={href}
      rel="preload"
      href={href}
      as={as}
      type={type}
      {...(imageSrcSet && { imageSrcSet })}
      {...(imageSizes && { imageSizes })}
    />
  );
}

/**
 * Image performance monitoring
 * Track LCP (Largest Contentful Paint) for images
 */
export function useImagePerformance(elementRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!elementRef.current || typeof window === 'undefined') return;

    try {
      // Performance Observer for LCP
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
          element?: HTMLElement;
        };

        if (lastEntry?.element === elementRef.current) {
          console.log('[ImagePerformance] LCP:', lastEntry.startTime, 'ms');
          
          // Send to analytics (optional)
          if (typeof window !== 'undefined' && 'sendBeacon' in navigator) {
            navigator.sendBeacon('/api/analytics', JSON.stringify({
              event: 'image_lcp',
              properties: {
                loadTime: lastEntry.startTime,
                url: window.location.pathname,
              },
            }));
          }
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });

      return () => observer.disconnect();
    } catch (error) {
      console.error('[useImagePerformance] Error:', error);
      return;
    }
  }, [elementRef]);
}

/**
 * Progressive image loading hook
 * For custom implementations
 * 
 * @example
 * const { imgRef, isInView, isLoaded } = useProgressiveImage({
 *   rootMargin: '100px',
 *   threshold: 0.1
 * });
 * 
 * <img ref={imgRef} src={isInView ? actualSrc : placeholderSrc} />
 */
export function useProgressiveImage(options: {
  rootMargin?: string;
  threshold?: number;
} = {}) {
  const { rootMargin = '50px', threshold = 0.01 } = options;
  
  const imgRef = useRef<HTMLImageElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin, threshold }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  const handleLoad = () => setIsLoaded(true);

  return {
    imgRef,
    isInView,
    isLoaded,
    handleLoad,
  };
}
