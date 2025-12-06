'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';

interface CCTVGlitchImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  unoptimized?: boolean;
  className?: string;
}

type GlitchState = 'idle' | 'glitching' | 'clean';

/**
 * CCTVGlitchImage - Image component with aggressive glitch effect on hover
 * 
 * Effect matches glitchcard.tsx exactly:
 * - Starts grayscale with contrast boost
 * - 800ms glitch animation with clip-path RGB channel splits
 * - Transitions to color with scanlines/vignette
 * - Works with parent .group hover (for overlays that block pointer events)
 */
export function CCTVGlitchImage({
  src,
  alt,
  fill = true,
  width,
  height,
  sizes,
  priority = false,
  unoptimized = false,
  className = '',
}: CCTVGlitchImageProps) {
  const [status, setStatus] = useState<GlitchState>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    // If already active or glitching, do nothing
    if (status !== 'idle') return;

    setStatus('glitching');

    // Transition from glitch to clean (no scanlines) after 1s
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setStatus('clean');
    }, 1000);
  }, [status]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus('idle');
  }, []);

  // Listen to parent .group hover for cases where overlay elements block direct hover events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find closest .group ancestor
    const groupParent = container.closest('.group');
    if (!groupParent) return;

    const onEnter = () => handleMouseEnter();
    const onLeave = () => handleMouseLeave();

    groupParent.addEventListener('mouseenter', onEnter);
    groupParent.addEventListener('mouseleave', onLeave);

    return () => {
      groupParent.removeEventListener('mouseenter', onEnter);
      groupParent.removeEventListener('mouseleave', onLeave);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleMouseEnter, handleMouseLeave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const isGlitching = status === 'glitching';
  const isClean = status === 'clean';

  return (
    <div 
      ref={containerRef}
      className="glitch-container relative w-full h-full overflow-hidden bg-black"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* AGGRESSIVE GLITCH KEYFRAMES - 3 RGB channels, 10-15px translations, 0.1s speed */}
      <style jsx global>{`
        @keyframes glitch-anim-1 {
          0% { clip-path: inset(8% 0 85% 0); transform: translate(-12px, 2px) skewX(-2deg); }
          10% { clip-path: inset(75% 0 5% 0); transform: translate(10px, -3px) skewX(1deg); }
          20% { clip-path: inset(35% 0 45% 0); transform: translate(-15px, 4px) skewX(-1deg); }
          30% { clip-path: inset(90% 0 2% 0); transform: translate(8px, -2px) skewX(2deg); }
          40% { clip-path: inset(15% 0 70% 0); transform: translate(-10px, 5px) skewX(-2deg); }
          50% { clip-path: inset(50% 0 30% 0); transform: translate(14px, -4px) skewX(1deg); }
          60% { clip-path: inset(5% 0 92% 0); transform: translate(-8px, 3px) skewX(-1deg); }
          70% { clip-path: inset(65% 0 15% 0); transform: translate(12px, -5px) skewX(2deg); }
          80% { clip-path: inset(25% 0 55% 0); transform: translate(-14px, 2px) skewX(-2deg); }
          90% { clip-path: inset(80% 0 8% 0); transform: translate(10px, -3px) skewX(1deg); }
          100% { clip-path: inset(40% 0 40% 0); transform: translate(-12px, 4px) skewX(-1deg); }
        }
        @keyframes glitch-anim-2 {
          0% { clip-path: inset(45% 0 35% 0); transform: translate(14px, -3px) skewX(2deg); }
          10% { clip-path: inset(10% 0 75% 0); transform: translate(-10px, 4px) skewX(-1deg); }
          20% { clip-path: inset(70% 0 15% 0); transform: translate(12px, -2px) skewX(1deg); }
          30% { clip-path: inset(25% 0 60% 0); transform: translate(-15px, 5px) skewX(-2deg); }
          40% { clip-path: inset(85% 0 5% 0); transform: translate(8px, -4px) skewX(2deg); }
          50% { clip-path: inset(5% 0 88% 0); transform: translate(-12px, 3px) skewX(-1deg); }
          60% { clip-path: inset(55% 0 25% 0); transform: translate(14px, -5px) skewX(1deg); }
          70% { clip-path: inset(30% 0 50% 0); transform: translate(-10px, 2px) skewX(-2deg); }
          80% { clip-path: inset(95% 0 2% 0); transform: translate(15px, -3px) skewX(2deg); }
          90% { clip-path: inset(18% 0 65% 0); transform: translate(-8px, 4px) skewX(-1deg); }
          100% { clip-path: inset(60% 0 20% 0); transform: translate(12px, -2px) skewX(1deg); }
        }
        @keyframes glitch-anim-3 {
          0% { clip-path: inset(50% 0 30% 0); transform: translate(8px, 0) skewX(1deg); }
          15% { clip-path: inset(20% 0 60% 0); transform: translate(-10px, 2px) skewX(-2deg); }
          30% { clip-path: inset(70% 0 10% 0); transform: translate(12px, -1px) skewX(2deg); }
          45% { clip-path: inset(35% 0 45% 0); transform: translate(-8px, 3px) skewX(-1deg); }
          60% { clip-path: inset(85% 0 5% 0); transform: translate(10px, -2px) skewX(1deg); }
          75% { clip-path: inset(15% 0 70% 0); transform: translate(-12px, 1px) skewX(-2deg); }
          90% { clip-path: inset(60% 0 25% 0); transform: translate(8px, -3px) skewX(2deg); }
          100% { clip-path: inset(40% 0 40% 0); transform: translate(-10px, 2px) skewX(-1deg); }
        }
        @keyframes white-flash {
          0%, 40%, 100% { opacity: 0; }
          10%, 30% { opacity: 0.5; }
          20% { opacity: 0.8; }
          50%, 70% { opacity: 0.3; }
          60% { opacity: 0.6; }
          80% { opacity: 0.1; }
          90% { opacity: 0.4; }
        }
        @keyframes scanline-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        @keyframes tear-scroll {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-glitch-1 {
          animation: glitch-anim-1 0.12s infinite steps(2) alternate-reverse;
        }
        .animate-glitch-2 {
          animation: glitch-anim-2 0.1s infinite steps(3) alternate-reverse;
        }
        .animate-glitch-3 {
          animation: glitch-anim-3 0.15s infinite steps(4);
        }
        .animate-white-flash {
          animation: white-flash 0.08s infinite steps(1);
        }
        .animate-scanlines {
          background: linear-gradient(
            to bottom,
            rgba(255,255,255,0),
            rgba(255,255,255,0) 50%,
            rgba(0,0,0,0.3) 50%,
            rgba(0,0,0,0.3)
          );
          background-size: 100% 4px;
          animation: scanline-scroll 15s linear infinite;
        }
        .animate-tear {
          animation: tear-scroll 0.3s infinite linear;
        }
      `}</style>

      {/* --- BASE IMAGE (Changes based on state) --- */}
      <div className={`relative w-full h-full transition-all duration-150 ${status === 'idle' ? 'grayscale contrast-125 brightness-75 blur-[0.5px]' : ''}`}>
        <Image
          src={src}
          alt={alt}
          fill={fill}
          width={!fill ? width : undefined}
          height={!fill ? height : undefined}
          sizes={sizes}
          priority={priority}
          unoptimized={unoptimized}
          className={`object-cover ${className}`}
        />
      </div>

      {/* --- GLITCH LAYERS - 2 RGB channels with exclusion blend to prevent burn --- */}
      {isGlitching && (
        <>
          {/* Red/Magenta Channel Shift */}
          <div 
            className="absolute inset-0 mix-blend-exclusion opacity-60 animate-glitch-1 pointer-events-none z-10"
            aria-hidden="true"
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              sizes={sizes}
              unoptimized={unoptimized}
              style={{ filter: 'brightness(110%) saturate(150%) hue-rotate(-30deg)' }}
            />
          </div>
          {/* Cyan/Blue Channel Shift */}
          <div 
            className="absolute inset-0 mix-blend-exclusion opacity-60 animate-glitch-2 pointer-events-none z-20"
            aria-hidden="true"
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              sizes={sizes}
              unoptimized={unoptimized}
              style={{ filter: 'brightness(110%) saturate(150%) hue-rotate(180deg)' }}
            />
          </div>
          {/* Noise/Static Overlay */}
          <div className="absolute inset-0 bg-white/15 mix-blend-overlay animate-white-flash pointer-events-none z-30" />
          {/* Horizontal Tear Lines */}
          <div 
            className="absolute inset-0 pointer-events-none z-40 animate-tear"
            style={{
              background: `
                linear-gradient(transparent 0%, transparent 45%, rgba(0,255,255,0.3) 45%, rgba(0,255,255,0.3) 46%, transparent 46%),
                linear-gradient(transparent 0%, transparent 78%, rgba(255,0,100,0.3) 78%, rgba(255,0,100,0.3) 79%, transparent 79%)
              `
            }}
          />
        </>
      )}

      {/* --- ACTIVE MONITOR EFFECTS (Visible during 'active' & 'glitching') --- */}
      {isGlitching && (
        <div className="absolute inset-0 pointer-events-none z-50">
          {/* Scanlines - very subtle */}
          <div className="absolute inset-0 animate-scanlines opacity-15" />
          {/* Vignette - subtle */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_70%,rgba(0,0,0,0.3)_100%)]" />
        </div>
      )}

      {/* Clean state: restore natural image, no overlays */}
      {isClean && (
        <div className="absolute inset-0 pointer-events-none z-40" />
      )}
    </div>
  );
}
