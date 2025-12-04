'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface GlitchImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  unoptimized?: boolean;
}

type GlitchState = 'idle' | 'glitching' | 'active';

export function GlitchImage({
  src,
  alt,
  fill = true,
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  className = "",
  unoptimized = false,
}: GlitchImageProps) {
  const [status, setStatus] = useState<GlitchState>('idle');
  const timeoutRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (status !== 'idle') return;
    setStatus('glitching');
    
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setStatus('active');
    }, 600);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setStatus('idle');
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Keyframes for glitch animation */}
      <style>{`
        @keyframes news-glitch-1 {
          0% { clip-path: inset(20% 0 80% 0); transform: translate(-3px, 1px); }
          20% { clip-path: inset(60% 0 10% 0); transform: translate(3px, -1px); }
          40% { clip-path: inset(40% 0 50% 0); transform: translate(-2px, 2px); }
          60% { clip-path: inset(80% 0 5% 0); transform: translate(2px, -2px); }
          80% { clip-path: inset(10% 0 70% 0); transform: translate(-1px, 1px); }
          100% { clip-path: inset(30% 0 50% 0); transform: translate(1px, -1px); }
        }
        @keyframes news-glitch-2 {
          0% { clip-path: inset(10% 0 60% 0); transform: translate(3px, -1px); }
          20% { clip-path: inset(80% 0 5% 0); transform: translate(-3px, 2px); }
          40% { clip-path: inset(30% 0 20% 0); transform: translate(2px, 1px); }
          60% { clip-path: inset(15% 0 80% 0); transform: translate(-1px, -2px); }
          80% { clip-path: inset(55% 0 10% 0); transform: translate(1px, 2px); }
          100% { clip-path: inset(40% 0 30% 0); transform: translate(-2px, 1px); }
        }
        @keyframes news-scanline {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        .news-glitch-red {
          animation: news-glitch-1 0.3s infinite linear alternate-reverse;
        }
        .news-glitch-blue {
          animation: news-glitch-2 0.3s infinite linear alternate-reverse;
        }
        .news-scanlines {
          background: linear-gradient(
            to bottom,
            rgba(255,255,255,0),
            rgba(255,255,255,0) 50%,
            rgba(0,0,0,0.15) 50%,
            rgba(0,0,0,0.15)
          );
          background-size: 100% 4px;
          animation: news-scanline 15s linear infinite;
        }
      `}</style>

      {/* Base image - grayscale when idle, color when active */}
      <div 
        className={`
          relative w-full h-full transition-all duration-300
          ${status === 'idle' ? 'grayscale contrast-110 brightness-90' : 'grayscale-0 contrast-100 brightness-100'}
        `}
      >
        <Image
          src={src}
          alt={alt}
          fill={fill}
          priority={priority}
          sizes={sizes}
          className={`object-cover ${className}`}
          unoptimized={unoptimized}
        />
      </div>

      {/* Glitch layers - only during glitching state */}
      {status === 'glitching' && (
        <>
          {/* Red channel shift */}
          <div 
            className="absolute inset-0 mix-blend-screen opacity-60 news-glitch-red pointer-events-none"
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'grayscale(100%) brightness(150%) sepia(100%) hue-rotate(-50deg) saturate(400%)',
            }}
          />
          {/* Blue/Cyan channel shift */}
          <div 
            className="absolute inset-0 mix-blend-screen opacity-60 news-glitch-blue pointer-events-none"
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'grayscale(100%) brightness(150%) sepia(100%) hue-rotate(160deg) saturate(400%)',
            }}
          />
          {/* Noise flash */}
          <div className="absolute inset-0 bg-white/20 mix-blend-overlay animate-pulse pointer-events-none" />
        </>
      )}

      {/* CRT monitor effects - visible during glitching and active */}
      {(status === 'active' || status === 'glitching') && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Scanlines */}
          <div className="absolute inset-0 news-scanlines opacity-20" />
          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.4)_100%)]" />
        </div>
      )}
    </div>
  );
}
