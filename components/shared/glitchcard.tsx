import React, { useState, useEffect, useRef } from 'react';

interface CCTVGlitchCardProps {
  src: string;
  alt?: string;
}

type GlitchState = 'idle' | 'glitching' | 'active';

export const CCTVGlitchCard: React.FC<CCTVGlitchCardProps> = ({ 
  src, 
  alt = "CCTV Feed" 
}) => {
  const [status, setStatus] = useState<GlitchState>('idle');
  const timeoutRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    // If already active or glitching, do nothing
    if (status !== 'idle') return;

    setStatus('glitching');

    // Transition from glitch to active (color view) after 1000ms to cap glitch/tearing duration
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setStatus('active');
    }, 1000); // Fixed 1s glitch window
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
      className="relative group w-full max-w-sm mx-auto bg-black border border-white overflow-hidden cursor-crosshair shadow-2xl"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Internal Styles for keyframes that are hard to do with pure Tailwind arbitrary values */}
      <style>{`
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

      {/* Container for Aspect Ratio - Changed to Square */}
      <div className="relative aspect-square bg-black overflow-hidden">
        
        {/* --- BASE IMAGE (Changes state) --- */}
        <div className={`w-full h-full transition-all duration-100 ${status === 'idle' ? 'filter grayscale contrast-125 brightness-75 blur-[0.5px]' : 'filter-none'}`}>
          <img 
            src={src} 
            alt={alt} 
            className="w-full h-full object-cover"
          />
        </div>

        {/* --- GLITCH LAYERS (Only visible during 'glitching') --- */}
        {status === 'glitching' && (
          <>
            {/* Red Channel Shift */}
            <div 
              className="absolute inset-0 bg-transparent mix-blend-screen opacity-70 animate-glitch-1 pointer-events-none"
              style={{ 
                backgroundImage: `url(${src})`, 
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'grayscale(100%) brightness(150%) sepia(100%) hue-rotate(-50deg) saturate(300%)' // Simulated Red
              }}
            />
            {/* Blue Channel Shift */}
            <div 
              className="absolute inset-0 bg-transparent mix-blend-screen opacity-70 animate-glitch-2 pointer-events-none"
              style={{ 
                backgroundImage: `url(${src})`, 
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'grayscale(100%) brightness(150%) sepia(100%) hue-rotate(180deg) saturate(300%)' // Simulated Blue
              }}
            />
            {/* Random White Noise Overlay for glitch moment */}
            <div className="absolute inset-0 bg-white/10 mix-blend-overlay animate-pulse" />
          </>
        )}

        {/* --- ACTIVE MONITOR EFFECTS (Scanlines only, keeps final state natural color) --- */}
        {(status === 'active' || status === 'glitching') && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute inset-0 animate-scanlines opacity-30" />
          </div>
        )}
      </div>
    </div>
  );
};