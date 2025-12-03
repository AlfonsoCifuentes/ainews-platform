'use client';

import { useRef, useMemo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface ThotNetOrbProps {
  metrics: {
    sources: number;
    articles: number;
    bilingual: boolean;
  };
  orbitTopics: string[];
  interactive?: boolean;
}

/**
 * ThotNetOrb - 3D animated orb element (yinger.dev + godly video style)
 * - Smooth rotation with parallax (max 8° on desktop)
 * - Orbiting topic chips
 * - Idle animation only on mobile
 */
export function ThotNetOrb({ metrics, orbitTopics, interactive = true }: ThotNetOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mouse tracking for parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Smooth spring physics
  const springConfig = { damping: 30, stiffness: 150 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!interactive || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    mouseX.set((e.clientX - centerX) / rect.width);
    mouseY.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Generate orbit positions for topics
  const topicPositions = useMemo(() => {
    return orbitTopics.slice(0, 6).map((topic, i) => {
      const angle = (i * 360) / Math.min(orbitTopics.length, 6);
      const radius = 140; // px from center
      return {
        topic,
        angle,
        x: Math.cos((angle * Math.PI) / 180) * radius,
        y: Math.sin((angle * Math.PI) / 180) * radius,
        delay: i * 0.15,
      };
    });
  }, [orbitTopics]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] lg:w-[450px] lg:h-[450px]"
      style={{ perspective: 1000 }}
    >
      {/* Main orb with 3D rotation */}
      <motion.div
        style={{ rotateX, rotateY }}
        className="relative w-full h-full flex items-center justify-center"
      >
        {/* Outer glow rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
        >
          <div className="absolute inset-8 rounded-full border border-primary/20" />
          <div className="absolute inset-16 rounded-full border border-amber-500/15" />
          <div className="absolute inset-24 rounded-full border border-primary/10" />
        </motion.div>

        {/* Orbiting topic chips */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
        >
          {topicPositions.map(({ topic, x, y, delay }) => (
            <motion.div
              key={topic}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + delay, duration: 0.5 }}
              className="absolute left-1/2 top-1/2"
              style={{
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                whileHover={{ scale: 1.1 }}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-xs font-medium text-white/70 whitespace-nowrap cursor-default"
              >
                {topic}
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Central orb */}
        <motion.div
          animate={{
            boxShadow: [
              '0 0 60px 20px rgba(59,130,246,0.3), 0 0 120px 60px rgba(59,130,246,0.1)',
              '0 0 80px 30px rgba(245,158,11,0.25), 0 0 140px 70px rgba(245,158,11,0.08)',
              '0 0 60px 20px rgba(59,130,246,0.3), 0 0 120px 60px rgba(59,130,246,0.1)',
            ],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 rounded-full"
        >
          {/* Gradient background */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/80 via-blue-600/60 to-amber-500/40" />
          
          {/* Glass overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/40 to-transparent" />
          
          {/* Inner highlight */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/20 to-transparent" />

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <svg 
                viewBox="0 0 100 100" 
                className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-lg"
                fill="none"
              >
                {/* Simplified ThotNet logo hexagon */}
                <path
                  d="M50 5L93.3 27.5V72.5L50 95L6.7 72.5V27.5L50 5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.8"
                />
                <path
                  d="M50 20L75 35V65L50 80L25 65V35L50 20Z"
                  fill="currentColor"
                  opacity="0.6"
                />
                <circle cx="50" cy="50" r="10" fill="currentColor" />
              </svg>
            </motion.div>

            {/* Metrics display */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-2 text-center"
            >
              <div className="text-2xl sm:text-3xl font-black tabular-nums">
                {metrics.sources}+
              </div>
              <div className="text-[10px] uppercase tracking-widest text-white/60">
                Sources
              </div>
            </motion.div>
          </div>

          {/* Pulsing ring */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 rounded-full border-2 border-primary/50"
          />
        </motion.div>
      </motion.div>

      {/* Corner stats (yinger.dev style) */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2 }}
        className="absolute -right-4 top-1/4 text-right hidden lg:block"
      >
        <div className="text-xs font-mono text-white/40 uppercase tracking-wider">
          Articles
        </div>
        <div className="text-lg font-bold text-white/80 tabular-nums">
          {metrics.articles.toLocaleString()}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.4 }}
        className="absolute -left-4 bottom-1/4 hidden lg:block"
      >
        <div className="text-xs font-mono text-white/40 uppercase tracking-wider">
          Languages
        </div>
        <div className="text-lg font-bold text-white/80 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {metrics.bilingual ? 'EN / ES' : 'EN'}
        </div>
      </motion.div>
    </div>
  );
}
