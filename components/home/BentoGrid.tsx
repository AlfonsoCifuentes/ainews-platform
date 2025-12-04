'use client';

import { motion } from 'framer-motion';
import { TrendingUp, BookOpen, Zap, Globe, Award, Brain, ArrowUpRight } from 'lucide-react';
import { Link } from '@/i18n';
import { ReactNode } from 'react';

interface BentoCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  className?: string;
  delay?: number;
  index: number;
}

function BentoCard({ title, description, icon, href, className = '', delay = 0, index }: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <Link href={href}>
        <motion.div
          whileHover={{ y: -5, borderColor: '#EAEAEA' }}
          className={`group relative overflow-hidden border border-[#1F1F1F] bg-[#0A0A0A] p-8 transition-all duration-500 hover:bg-[#0F0F0F] ${className}`}
        >
          {/* Index number */}
          <span className="absolute top-4 right-4 font-mono text-xs text-[#333333] tracking-wider">
            {String(index + 1).padStart(2, '0')}
          </span>
          
          {/* Icon - Brutalist style */}
          <div className="relative z-10 mb-6 inline-flex p-3 border border-[#333333] text-[#888888] transition-all duration-300 group-hover:border-[#EAEAEA] group-hover:text-[#EAEAEA]">
            {icon}
          </div>
          
          {/* Content */}
          <div className="relative z-10">
            <h3 className="mb-2 text-xl font-bold text-[#EAEAEA] transition-colors group-hover:text-white flex items-center gap-2">
              {title}
              <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </h3>
            <p className="text-sm text-[#888888] font-mono transition-colors group-hover:text-[#AAAAAA]">
              {description}
            </p>
          </div>
          
          {/* Hover line accent */}
          <motion.div 
            className="absolute bottom-0 left-0 h-px w-0 bg-[#EAEAEA] group-hover:w-full transition-all duration-500"
          />
        </motion.div>
      </Link>
    </motion.div>
  );
}

interface BentoGridProps {
  locale: 'en' | 'es';
}

export function BentoGrid({ locale }: BentoGridProps) {
  const content = {
    en: {
      trending: {
        title: 'Trending Topics',
        description: 'Discover what\'s hot in AI right now',
      },
      news: {
        title: 'Latest News',
        description: 'Stay updated with breaking AI news',
      },
      courses: {
        title: 'AI Courses',
        description: 'Learn from AI-generated courses',
      },
      kg: {
        title: 'Knowledge Graph',
        description: 'Explore the AI knowledge universe',
      },
      leaderboard: {
        title: 'Leaderboard',
        description: 'Compete and earn achievements',
      },
      features: {
        title: 'Smart Features',
        description: 'AI-powered tools and insights',
      },
    },
    es: {
      trending: {
        title: 'Tendencias',
        description: 'Descubre lo más relevante en IA ahora',
      },
      news: {
        title: 'Últimas Noticias',
        description: 'Mantente al día con noticias de IA',
      },
      courses: {
        title: 'Cursos de IA',
        description: 'Aprende con cursos generados por IA',
      },
      kg: {
        title: 'Grafo de Conocimiento',
        description: 'Explora el universo del conocimiento IA',
      },
      leaderboard: {
        title: 'Clasificación',
        description: 'Compite y gana logros',
      },
      features: {
        title: 'Funciones Inteligentes',
        description: 'Herramientas e insights impulsados por IA',
      },
    },
  };

  const t = content[locale];

  return (
    <div className="grid grid-cols-1 gap-px md:grid-cols-2 lg:grid-cols-3 border border-[#1F1F1F]">
      {/* Large card - Trending (spans 2 columns) */}
      <BentoCard
        title={t.trending.title}
        description={t.trending.description}
        icon={<TrendingUp className="h-6 w-6" />}
        href="/trending"
        className="md:col-span-2 lg:row-span-2 lg:min-h-[300px]"
        delay={0}
        index={0}
      />

      {/* News */}
      <BentoCard
        title={t.news.title}
        description={t.news.description}
        icon={<Globe className="h-6 w-6" />}
        href="/news"
        className="lg:row-span-1"
        delay={0.1}
        index={1}
      />

      {/* Courses */}
      <BentoCard
        title={t.courses.title}
        description={t.courses.description}
        icon={<BookOpen className="h-6 w-6" />}
        href="/courses"
        className="lg:row-span-1"
        delay={0.2}
        index={2}
      />

      {/* Knowledge Graph (tall) */}
      <BentoCard
        title={t.kg.title}
        description={t.kg.description}
        icon={<Brain className="h-6 w-6" />}
        href="/kg"
        className="md:col-span-1 lg:row-span-2"
        delay={0.3}
        index={3}
      />

      {/* Leaderboard */}
      <BentoCard
        title={t.leaderboard.title}
        description={t.leaderboard.description}
        icon={<Award className="h-6 w-6" />}
        href="/leaderboard"
        className="lg:row-span-1"
        delay={0.4}
        index={4}
      />

      {/* Features */}
      <BentoCard
        title={t.features.title}
        description={t.features.description}
        icon={<Zap className="h-6 w-6" />}
        href="/features"
        className="lg:row-span-1"
        delay={0.5}
        index={5}
      />
    </div>
  );
}
