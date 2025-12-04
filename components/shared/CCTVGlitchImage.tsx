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

type GlitchState = 'idle' | 'glitching' | 'active';

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

    // Transition from glitch to active (color view) after 800ms
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setStatus('active');
    }, 800); // Duration of the glitch effect - matches glitchcard.tsx
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

  const isHovering = status !== 'idle';
  const isGlitching = status === 'glitching';

  return (
    <div 
      ref={containerRef}
      className="glitch-container relative w-full h-full overflow-hidden bg-black"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Keyframes matching glitchcard.tsx exactly */}
      <style jsx global>{`
        @keyframes glitch-anim-1 {
          0% { clip-path: inset(20% 0 80% 0); transform: translate(-2px, 1px); }
          20% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -1px); }
          40% { clip-path: inset(40% 0 50% 0); transform: translate(-2px, 2px); }
          60% { clip-path: inset(80% 0 5% 0); transform: translate(2px, -2px); }
          80% { clip-path: inset(10% 0 70% 0); transform: translate(-1px, 1px); }
          100% { clip-path: inset(30% 0 50% 0); transform: translate(1px, -1px); }
        }
        @keyframes glitch-anim-2 {
          0% { clip-path: inset(10% 0 60% 0); transform: translate(2px, -1px); }
          20% { clip-path: inset(80% 0 5% 0); transform: translate(-2px, 2px); }
          40% { clip-path: inset(30% 0 20% 0); transform: translate(2px, 1px); }
          60% { clip-path: inset(15% 0 80% 0); transform: translate(-1px, -2px); }
          80% { clip-path: inset(55% 0 10% 0); transform: translate(1px, 2px); }
          100% { clip-path: inset(40% 0 30% 0); transform: translate(-2px, 1px); }
        }
        @keyframes scanline-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        .animate-glitch-1 {
          animation: glitch-anim-1 0.4s infinite linear alternate-reverse;
        }
        .animate-glitch-2 {
          animation: glitch-anim-2 0.4s infinite linear alternate-reverse;
        }
        .animate-scanlines {
          background: linear-gradient(
            to bottom,
            rgba(255,255,255,0),
            rgba(255,255,255,0) 50%,
            rgba(0,0,0,0.2) 50%,
            rgba(0,0,0,0.2)
          );
          background-size: 100% 4px;
          animation: scanline-scroll 20s linear infinite;
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

      {/* --- GLITCH LAYERS (Only visible during 'glitching') --- */}
      {isGlitching && (
        <>
          {/* Red Channel Shift - clip-path animation */}
          <div 
            className="absolute inset-0 mix-blend-screen opacity-70 animate-glitch-1 pointer-events-none"
            aria-hidden="true"
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              sizes={sizes}
              unoptimized={unoptimized}
              style={{ filter: 'grayscale(100%) brightness(150%) sepia(100%) hue-rotate(-50deg) saturate(300%)' }}
            />
          </div>
          {/* Blue Channel Shift - clip-path animation */}
          <div 
            className="absolute inset-0 mix-blend-screen opacity-70 animate-glitch-2 pointer-events-none"
            aria-hidden="true"
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              sizes={sizes}
              unoptimized={unoptimized}
              style={{ filter: 'grayscale(100%) brightness(150%) sepia(100%) hue-rotate(180deg) saturate(300%)' }}
            />
          </div>
          {/* White Noise Overlay for glitch moment */}
          <div className="absolute inset-0 bg-white/10 mix-blend-overlay animate-pulse pointer-events-none" />
        </>
      )}

      {/* --- ACTIVE MONITOR EFFECTS (Visible during 'active' & 'glitching') --- */}
      {isHovering && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Scanlines */}
          <div className="absolute inset-0 animate-scanlines opacity-30" />
          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]" />
          {/* Slight tube glow */}
          <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,255,0,0.1)]" />
        </div>
      )}
    </div>
  );
}
