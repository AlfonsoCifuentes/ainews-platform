'use client';

import { useState, useCallback } from 'react';
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

/**
 * CCTVGlitchImage - Image component with CCTV glitch effect on hover
 * 
 * Features:
 * - Starts grayscale, transitions to color on hover
 * - Glitch/tearing effect on hover start
 * - Animated scanlines while hovering (arcade CRT style)
 * - VHS tracking distortion effect
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
  const [isHovering, setIsHovering] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    setIsGlitching(true);
    
    // Glitch effect lasts 400ms then stops
    setTimeout(() => {
      setIsGlitching(false);
    }, 400);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setIsGlitching(false);
  }, []);

  return (
    <div 
      className="cctv-container relative w-full h-full overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main Image */}
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        className={`
          object-cover transition-all duration-500
          ${isHovering ? 'grayscale-0 scale-105' : 'grayscale'}
          ${isGlitching ? 'cctv-glitch' : ''}
          ${className}
        `}
      />

      {/* Glitch Layers - Only visible during glitch */}
      {isGlitching && (
        <>
          <div className="cctv-glitch-layer cctv-glitch-r" />
          <div className="cctv-glitch-layer cctv-glitch-g" />
          <div className="cctv-glitch-layer cctv-glitch-b" />
          <div className="cctv-tear" />
        </>
      )}

      {/* Scanlines - Visible while hovering */}
      {isHovering && (
        <div className="cctv-scanlines" />
      )}

      {/* VHS Noise Overlay */}
      {isHovering && (
        <div className="cctv-noise" />
      )}

      {/* CRT Vignette */}
      <div className={`cctv-vignette ${isHovering ? 'opacity-60' : 'opacity-0'}`} />

      {/* Timestamp Overlay */}
      {isHovering && (
        <div className="absolute top-2 left-2 font-mono text-[10px] text-[#00ff00] opacity-80 z-20 mix-blend-screen">
          <span className="cctv-blink">REC</span>
          <span className="ml-2">{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
        </div>
      )}

      <style jsx>{`
        .cctv-container {
          position: relative;
        }

        /* Main Glitch Animation */
        :global(.cctv-glitch) {
          animation: cctv-glitch-skew 0.4s steps(2) forwards;
        }

        @keyframes cctv-glitch-skew {
          0% {
            transform: skewX(0deg) scale(1);
            filter: grayscale(100%);
          }
          10% {
            transform: skewX(-2deg) scale(1.01);
            filter: grayscale(80%) hue-rotate(90deg);
          }
          20% {
            transform: skewX(3deg) translateX(5px) scale(1);
            filter: grayscale(50%) saturate(150%);
          }
          30% {
            transform: skewX(-1deg) translateX(-3px) scale(1.02);
            filter: grayscale(30%);
          }
          40% {
            transform: skewX(2deg) translateY(2px) scale(1);
            filter: grayscale(10%) saturate(120%);
          }
          50% {
            transform: skewX(0deg) scale(1.01);
            filter: grayscale(0%);
          }
          60% {
            transform: skewX(-1deg) scale(1);
          }
          70% {
            transform: skewX(1deg) scale(1.005);
          }
          80% {
            transform: skewX(0deg) scale(1);
          }
          100% {
            transform: skewX(0deg) scale(1.05);
            filter: grayscale(0%) saturate(110%);
          }
        }

        /* RGB Split Glitch Layers */
        .cctv-glitch-layer {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          pointer-events: none;
          opacity: 0.5;
        }

        .cctv-glitch-r {
          background: inherit;
          animation: glitch-r 0.3s steps(1) infinite;
          mix-blend-mode: screen;
          filter: hue-rotate(-60deg);
        }

        .cctv-glitch-g {
          background: inherit;
          animation: glitch-g 0.25s steps(1) infinite;
          mix-blend-mode: screen;
          filter: hue-rotate(60deg);
        }

        .cctv-glitch-b {
          background: inherit;
          animation: glitch-b 0.35s steps(1) infinite;
          mix-blend-mode: screen;
          filter: hue-rotate(180deg);
        }

        @keyframes glitch-r {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-3px, 1px); }
          40% { transform: translate(2px, -1px); }
          60% { transform: translate(-1px, 2px); }
          80% { transform: translate(3px, 0); }
        }

        @keyframes glitch-g {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(2px, -2px); }
          50% { transform: translate(-2px, 1px); }
          75% { transform: translate(1px, 2px); }
        }

        @keyframes glitch-b {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(-2px, -1px); }
          66% { transform: translate(2px, 2px); }
        }

        /* Horizontal Tear Effect */
        .cctv-tear {
          position: absolute;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(255,255,255,0.8) 20%, 
            rgba(0,255,255,0.5) 50%, 
            rgba(255,255,255,0.8) 80%, 
            transparent 100%
          );
          animation: tear-move 0.4s steps(8) forwards;
          pointer-events: none;
          z-index: 15;
        }

        @keyframes tear-move {
          0% { top: 10%; opacity: 1; }
          25% { top: 35%; opacity: 0.8; }
          50% { top: 60%; opacity: 1; }
          75% { top: 80%; opacity: 0.6; }
          100% { top: 95%; opacity: 0; }
        }

        /* Animated Scanlines - Arcade CRT Style */
        .cctv-scanlines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent 0px,
            transparent 1px,
            rgba(0, 0, 0, 0.3) 1px,
            rgba(0, 0, 0, 0.3) 2px
          );
          animation: scanline-scroll 0.1s linear infinite;
          pointer-events: none;
          z-index: 10;
        }

        @keyframes scanline-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 4px; }
        }

        /* VHS Static Noise */
        .cctv-noise {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          opacity: 0.03;
          pointer-events: none;
          z-index: 12;
          animation: noise-flicker 0.05s steps(1) infinite;
        }

        @keyframes noise-flicker {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.05; }
        }

        /* CRT Vignette Effect */
        .cctv-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at center,
            transparent 50%,
            rgba(0, 0, 0, 0.8) 100%
          );
          pointer-events: none;
          z-index: 11;
          transition: opacity 0.3s ease;
        }

        /* REC Blinking */
        .cctv-blink {
          animation: blink 1s steps(1) infinite;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
