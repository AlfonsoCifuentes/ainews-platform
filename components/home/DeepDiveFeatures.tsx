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
 * DeepDiveFeatures - Brutalist platform features section
 * - Monospace section labels
 * - Minimal grayscale with border accents
 */
export function DeepDiveFeatures({ blocks, locale }: DeepDiveFeaturesProps) {
  return (
    <section className="py-20 border-t border-[#1F1F1F]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Brutalist Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <span className="font-mono text-xs tracking-widest text-[#888888] uppercase">
            05 — {locale === 'en' ? 'FEATURES' : 'CARACTERÍSTICAS'}
          </span>
          <h2 className="text-3xl lg:text-5xl font-bold text-[#EAEAEA] mt-2">
            {locale === 'en' ? 'Platform' : 'Plataforma'}
          </h2>
        </motion.div>

        {/* Feature blocks - Brutalist grid */}
        <div className="space-y-px">
          {blocks.map((block, i) => (
            <FeatureRow key={block.id} block={block} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureRow({
  block,
  index,
}: {
  block: FeatureBlock;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.3, 1, 1, 0.3]);

  return (
    <motion.div
      ref={ref}
      style={{ opacity }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="group grid lg:grid-cols-[1fr_400px] gap-8 p-8 border border-[#1F1F1F] hover:border-[#333333] hover:bg-[#0A0A0A]/50 transition-all duration-500"
    >
      {/* Text content */}
      <div className="flex flex-col justify-center">
        {/* Feature number */}
        <span className="font-mono text-xs text-[#666666] mb-4">
          {String(index + 1).padStart(2, '0')}
        </span>

        <h3 className="text-2xl lg:text-3xl font-bold text-[#EAEAEA] mb-4 group-hover:text-white transition-colors">
          {block.title}
        </h3>
        
        <p className="text-[#888888] text-base leading-relaxed max-w-xl group-hover:text-[#AAAAAA] transition-colors">
          {block.copy}
        </p>

        {/* Brutalist line accent */}
        <motion.div 
          className="w-16 h-px bg-[#333333] mt-6 group-hover:w-32 group-hover:bg-[#EAEAEA] transition-all duration-500"
        />
      </div>

      {/* Media - hidden on mobile, shown on larger screens */}
      <div className="hidden lg:block relative overflow-hidden border border-[#1F1F1F] group-hover:border-[#333333] transition-colors">
        <div className="aspect-[4/3] relative grayscale group-hover:grayscale-0 transition-all duration-700">
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
            <div className="w-full h-full flex items-center justify-center bg-[#0A0A0A]">
              <span className="font-mono text-6xl text-[#333333] group-hover:text-[#EAEAEA] transition-colors">
                {block.icon || '→'}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
