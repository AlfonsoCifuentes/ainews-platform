"use client";

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';

export default function HomePage() {
  const t = useTranslations('home');
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const logoScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);
  const logoOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.5], [0, -100]);

  return (
    <main ref={containerRef} className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#0a0b18] via-[#0f1023] to-[#0a0b18]">
      {/* Animated Background Grid */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'grid-flow 20s linear infinite'
        }} />
      </div>

      {/* Gradient Orbs */}
      <motion.div
        className="fixed top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-30"
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="fixed bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
        animate={{
          scale: [1.2, 1, 1.2],
          x: [0, -30, 0],
          y: [0, -50, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Hero Content */}
      <motion.section 
        className="relative flex min-h-screen items-center justify-center px-6"
        style={{ y: contentY }}
      >
        <div className="relative z-10 text-center max-w-5xl mx-auto">
          {/* Logo */}
          <motion.div
            style={{ scale: logoScale, opacity: logoOpacity }}
            className="mb-12"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: 0.2 
              }}
              className="relative inline-block"
            >
              <div className="absolute inset-0 blur-[60px] bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-60 animate-pulse" />
              <Image 
                src="/images/ainews-logo.png" 
                alt="AINews Logo" 
                width={240}
                height={240}
                className="relative drop-shadow-[0_0_80px_rgba(59,130,246,0.8)]"
                priority
              />
            </motion.div>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-6xl md:text-8xl lg:text-9xl font-black mb-8"
          >
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
              AINews
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="text-xl md:text-2xl lg:text-3xl text-white/70 mb-16 font-light tracking-wide"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
          >
            <Link href="/news">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative px-10 py-5 text-lg font-bold text-white overflow-hidden rounded-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                <span className="relative flex items-center gap-3">
                  {t('hero.cta')}
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </span>
              </motion.button>
            </Link>

            <Link href="/courses">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-5 text-lg font-bold text-white border-2 border-white/20 rounded-2xl backdrop-blur-sm hover:bg-white/5 transition-colors"
              >
                {t('hero.ctaSecondary')}
              </motion.button>
            </Link>
          </motion.div>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
            className="mt-20 flex flex-wrap justify-center gap-4"
          >
            {[
              { icon: '🤖', text: 'Self-Improving AI' },
              { icon: '📈', text: 'Live Trending' },
              { icon: '🕸️', text: 'Knowledge Graph' },
              { icon: '🎓', text: 'AI Courses' }
            ].map((item, i) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 + (i * 0.1) }}
                whileHover={{ scale: 1.1 }}
                className="px-6 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-white/80 text-sm font-semibold flex items-center gap-2"
              >
                <span className="text-xl">{item.icon}</span>
                {item.text}
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center"
          >
            <motion.div
              animate={{ y: [0, 12, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-3 bg-white/60 rounded-full mt-2"
            />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Quick Access Grid - Minimal */}
      <section className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                href: '/news',
                title: 'Latest News',
                desc: '50+ AI sources curated',
                icon: '📰',
                gradient: 'from-blue-500/20 to-cyan-500/20'
              },
              {
                href: '/trending',
                title: 'Trending',
                desc: 'Real-time topic detection',
                icon: '📈',
                gradient: 'from-purple-500/20 to-pink-500/20'
              },
              {
                href: '/kg',
                title: 'Knowledge Graph',
                desc: 'Interactive AI insights',
                icon: '🕸️',
                gradient: 'from-violet-500/20 to-blue-500/20'
              }
            ].map((card, i) => (
              <Link key={card.href} href={card.href}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className={`relative p-8 rounded-3xl border border-white/10 backdrop-blur-xl bg-gradient-to-br ${card.gradient} overflow-hidden group cursor-pointer`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <div className="text-5xl mb-4">{card.icon}</div>
                    <h3 className="text-2xl font-bold text-white mb-2">{card.title}</h3>
                    <p className="text-white/60">{card.desc}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="relative py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
              {t('aiFeatures.title')}
            </h2>
            <p className="text-white/60 text-lg">{t('aiFeatures.subtitle')}</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { key: 'llm', icon: '🤖', color: 'from-blue-500/10 to-cyan-500/10' },
              { key: 'embeddings', icon: '🔍', color: 'from-purple-500/10 to-pink-500/10' },
              { key: 'curator', icon: '📰', color: 'from-green-500/10 to-emerald-500/10' },
              { key: 'courseGen', icon: '🎓', color: 'from-orange-500/10 to-yellow-500/10' },
              { key: 'learning', icon: '🧠', color: 'from-violet-500/10 to-purple-500/10' },
              { key: 'validation', icon: '✅', color: 'from-teal-500/10 to-cyan-500/10' },
              { key: 'translation', icon: '🌐', color: 'from-blue-500/10 to-indigo-500/10' },
              { key: 'gamification', icon: '🎮', color: 'from-pink-500/10 to-rose-500/10' },
              { key: 'normalization', icon: '✨', color: 'from-amber-500/10 to-orange-500/10' },
              { key: 'deduplication', icon: '🔗', color: 'from-slate-500/10 to-gray-500/10' }
            ].map((item, i) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className={`p-4 rounded-2xl border border-white/10 backdrop-blur-sm bg-gradient-to-br ${item.color} group cursor-default`}
              >
                <div className="text-3xl mb-2">{item.icon}</div>
                <h3 className="text-sm font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                  {t(`aiFeatures.${item.key}.title`)}
                </h3>
                <p className="text-xs text-white/50 leading-tight">
                  {t(`aiFeatures.${item.key}.desc`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
        @keyframes grid-flow {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }
      `}</style>
    </main>
  );
}
