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

export function GlitchImage({
  src,
  alt,
  fill = true,
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  className = "",
  unoptimized = false,
}: GlitchImageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showGlitch, setShowGlitch] = useState(false);
  const glitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    setShowGlitch(true);
    
    // Clear any existing timeout
    if (glitchTimeoutRef.current) {
      clearTimeout(glitchTimeoutRef.current);
    }
    
    // Stop glitch animation after 500ms, keep color
    glitchTimeoutRef.current = setTimeout(() => {
      setShowGlitch(false);
    }, 500);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowGlitch(false);
    
    if (glitchTimeoutRef.current) {
      clearTimeout(glitchTimeoutRef.current);
      glitchTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (glitchTimeoutRef.current) {
        clearTimeout(glitchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="relative w-full h-full overflow-hidden group/glitch"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Global styles for the component */}
      <style jsx global>{`
        @keyframes glitch-anim-1 {
          0%, 100% { clip-path: inset(20% 0 60% 0); transform: translate(-4px, 2px); }
          25% { clip-path: inset(50% 0 30% 0); transform: translate(4px, -2px); }
          50% { clip-path: inset(70% 0 10% 0); transform: translate(-2px, 3px); }
          75% { clip-path: inset(10% 0 80% 0); transform: translate(3px, -3px); }
        }
        @keyframes glitch-anim-2 {
          0%, 100% { clip-path: inset(40% 0 40% 0); transform: translate(4px, -2px); }
          25% { clip-path: inset(10% 0 70% 0); transform: translate(-4px, 3px); }
          50% { clip-path: inset(80% 0 5% 0); transform: translate(2px, -1px); }
          75% { clip-path: inset(30% 0 50% 0); transform: translate(-3px, 2px); }
        }
        @keyframes glitch-flash {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.15; }
        }
        @keyframes scanline-move {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>

      {/* Base image layer - grayscale by default, color on hover */}
      <div className="relative w-full h-full">
        <Image
          src={src}
          alt={alt}
          fill={fill}
          priority={priority}
          sizes={sizes}
          className={`
            object-cover transition-all duration-500 ease-out
            ${isHovered ? '' : 'grayscale brightness-90 contrast-110'}
            ${className}
          `}
          unoptimized={unoptimized}
        />
      </div>

      {/* Glitch effect layers - only visible during glitch animation */}
      {showGlitch && (
        <>
          {/* Red/magenta channel shift */}
          <div 
            className="absolute inset-0 pointer-events-none mix-blend-screen"
            style={{
              animation: 'glitch-anim-1 0.15s infinite linear',
            }}
          >
            <Image
              src={src}
              alt=""
              fill
              sizes={sizes}
              className="object-cover opacity-70"
              style={{
                filter: 'sepia(100%) hue-rotate(-50deg) saturate(300%) brightness(130%)',
              }}
              unoptimized={unoptimized}
            />
          </div>

          {/* Cyan/blue channel shift */}
          <div 
            className="absolute inset-0 pointer-events-none mix-blend-screen"
            style={{
              animation: 'glitch-anim-2 0.15s infinite linear',
            }}
          >
            <Image
              src={src}
              alt=""
              fill
              sizes={sizes}
              className="object-cover opacity-70"
              style={{
                filter: 'sepia(100%) hue-rotate(150deg) saturate(300%) brightness(130%)',
              }}
              unoptimized={unoptimized}
            />
          </div>

          {/* White flash overlay */}
          <div 
            className="absolute inset-0 bg-white pointer-events-none"
            style={{
              animation: 'glitch-flash 0.1s infinite',
            }}
          />
        </>
      )}

      {/* Scanline effect - visible on hover */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent"
            style={{
              height: '200%',
              animation: 'scanline-move 2s linear infinite',
            }}
          />
        </div>
      )}

      {/* CRT vignette effect - always visible, stronger on hover */}
      <div 
        className={`
          absolute inset-0 pointer-events-none transition-opacity duration-300
          bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.5)_100%)]
          ${isHovered ? 'opacity-60' : 'opacity-30'}
        `}
      />
    </div>
  );
}
