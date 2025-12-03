'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';

interface FeatureBlock {
  id: string;
  title: string;
  copy: string;
  mediaType: 'image' | 'video' | 'lottie';
  mediaSrc: string;
  icon?: string;
}

interface DeepDiveFeaturesProps {
  blocks: FeatureBlock[];
  locale: 'en' | 'es';
}

/**
 * DeepDiveFeatures - Showcases key platform features
 * Reference: creativewebmanual.com - scroll-triggered animations
 * Alternating left/right layout with parallax
 */
export function DeepDiveFeatures({ blocks, locale }: DeepDiveFeaturesProps) {
  return (
    <section className="relative py-16 lg:py-24 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="text-center mb-16 lg:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-3 mb-3"
          >
            <span className="text-xs uppercase tracking-[0.2em] text-primary/80 font-semibold">
              {locale === 'en' ? 'Platform Features' : 'Características'}
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-white"
          >
            {locale === 'en' ? 'Deep Dive' : 'Explora a Fondo'}
          </motion.h2>
        </div>

        {/* Feature blocks */}
        <div className="space-y-24 lg:space-y-32">
          {blocks.map((block, i) => (
            <FeatureBlock
              key={block.id}
              block={block}
              index={i}
              reversed={i % 2 !== 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureBlock({
  block,
  index,
  reversed,
}: {
  block: FeatureBlock;
  index: number;
  reversed: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <motion.div
      ref={ref}
      style={{ opacity }}
      className={`
        grid lg:grid-cols-2 gap-8 lg:gap-16 items-center
        ${reversed ? 'lg:grid-flow-dense' : ''}
      `}
    >
      {/* Text content */}
      <motion.div
        initial={{ opacity: 0, x: reversed ? 30 : -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className={reversed ? 'lg:col-start-2' : ''}
      >
        {/* Feature number */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl lg:text-6xl font-black text-white/10">
            {String(index + 1).padStart(2, '0')}
          </span>
          {block.icon && (
            <span className="text-3xl">{block.icon}</span>
          )}
        </div>

        <h3 className="text-2xl lg:text-3xl font-black text-white mb-4">
          {block.title}
        </h3>
        
        <p className="text-white/60 text-lg leading-relaxed">
          {block.copy}
        </p>
      </motion.div>

      {/* Media */}
      <motion.div
        style={{ y }}
        className={`
          relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02]
          ${reversed ? 'lg:col-start-1' : ''}
        `}
      >
        <div className="aspect-[4/3] relative">
          {block.mediaType === 'image' && (
            <Image
              src={block.mediaSrc}
              alt={block.title}
              fill
              className="object-cover"
            />
          )}
          {block.mediaType === 'video' && (
            <video
              src={block.mediaSrc}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          )}
          {block.mediaType === 'lottie' && (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-amber-500/10">
              {/* Placeholder for Lottie - would integrate lottie-react here */}
              <span className="text-6xl">{block.icon || '✨'}</span>
            </div>
          )}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020309]/50 to-transparent pointer-events-none" />
      </motion.div>
    </motion.div>
  );
}
