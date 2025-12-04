'use client';

import { motion } from 'framer-motion';
import { useRef, useEffect } from 'react';
import { Link } from '@/i18n';
import { ArrowRight, Globe } from 'lucide-react';

interface KineticHeroProps {
  locale: 'en' | 'es';
  headline: string;
  subheadline: string;
  stats: {
    sources: number;
    freshnessMinutes: number;
    courses: number;
  };
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
}

export function KineticHero({
  locale: _locale,
  headline: _headline,
  subheadline,
  stats,
  primaryCta,
  secondaryCta,
}: KineticHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas-based orb animation (brutalist style)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    let w = canvas.width = parent.offsetWidth;
    let h = canvas.height = parent.offsetHeight;

    const particles: { x: number; y: number; r: number; v: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2 + 1,
        v: Math.random() * 0.5 + 0.1,
      });
    }

    let animationId: number;
    const render = () => {
      ctx.fillStyle = '#020309';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.35;
      const t = Date.now() * 0.001;

      // Wireframe sphere
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, radius, radius * Math.abs(Math.cos(t + i)), i * (Math.PI / 4), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Floating particles
      particles.forEach((p) => {
        p.y -= p.v;
        if (p.y < 0) p.y = h;
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5 + 0.2})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    };
    render();

    const handleResize = () => {
      if (!parent) return;
      w = canvas.width = parent.offsetWidth;
      h = canvas.height = parent.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-center px-6 md:px-12 pt-20 overflow-hidden z-10">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Typography Block */}
        <div className="lg:col-span-8 space-y-8">
          <div className="overflow-hidden">
            <motion.h1
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-[12vw] lg:text-[10vw] leading-[0.85] font-extrabold tracking-tighter text-white mix-blend-difference"
            >
              THOTNET
            </motion.h1>
          </div>
          <div className="overflow-hidden">
            <motion.h1
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-[12vw] lg:text-[10vw] leading-[0.85] font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-800 group cursor-default"
            >
              <span className="inline-block transition-all duration-500 ease-out group-hover:tracking-widest group-hover:blur-[2px] group-hover:text-white">
                CORE
              </span>
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="text-xl md:text-2xl text-[#888888] max-w-2xl font-light border-l border-white/20 pl-6"
          >
            {subheadline}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-6 pt-8"
          >
            <Link href={primaryCta.href}>
              <button className="group relative px-8 py-4 bg-white text-black font-bold tracking-tight text-lg rounded-sm overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">
                  {primaryCta.label}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gray-200 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
              </button>
            </Link>
            <Link href={secondaryCta.href}>
              <button className="group px-8 py-4 border border-white/20 text-[#EAEAEA] font-mono text-sm tracking-widest hover:bg-white/5 transition-colors flex items-center gap-2">
                <Globe className="w-4 h-4" /> {secondaryCta.label}
              </button>
            </Link>
          </motion.div>
        </div>

        {/* 3D Orb / Stats Panel */}
        <div className="lg:col-span-4 hidden lg:block relative h-[600px] w-full">
          <canvas ref={canvasRef} className="w-full h-full" />

          <div className="absolute bottom-10 -left-10 p-6 rounded-sm w-64 z-20 border-l-2 border-white bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/5">
            <div className="text-xs text-[#888888] font-mono mb-2">SYSTEM STATUS</div>
            <div className="flex justify-between items-end">
              <span className="text-3xl font-bold text-white">ONLINE</span>
              <div className="flex gap-1 h-4 items-end">
                <div className="w-1 h-full bg-white animate-pulse" />
                <div className="w-1 h-3/4 bg-white/50 animate-pulse" style={{ animationDelay: '75ms' }} />
                <div className="w-1 h-1/2 bg-white/30 animate-pulse" style={{ animationDelay: '150ms' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="absolute bottom-12 left-6 md:left-12 flex gap-12 font-mono text-sm"
      >
        <div>
          <span className="text-[#888888] block text-xs uppercase tracking-widest mb-1">Sources</span>
          <span className="text-white text-2xl font-bold">{stats.sources}</span>
        </div>
        <div>
          <span className="text-[#888888] block text-xs uppercase tracking-widest mb-1">Freshness</span>
          <span className="text-white text-2xl font-bold">{stats.freshnessMinutes}m</span>
        </div>
        <div>
          <span className="text-[#888888] block text-xs uppercase tracking-widest mb-1">Courses</span>
          <span className="text-white text-2xl font-bold">{stats.courses}+</span>
        </div>
      </motion.div>
    </section>
  );
}
