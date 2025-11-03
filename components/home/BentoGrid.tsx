'use client';

import { motion } from 'framer-motion';
import { TrendingUp, BookOpen, Zap, Globe, Award, Brain } from 'lucide-react';
import { Link } from '@/i18n';
import { ReactNode } from 'react';

interface BentoCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  className?: string;
  delay?: number;
}

function BentoCard({ title, description, icon, href, className = '', delay = 0 }: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <Link href={href}>
        <motion.div
          whileHover={{ scale: 1.02, rotateX: 2, rotateY: 2 }}
          className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 backdrop-blur-xl transition-all hover:border-primary/50 hover:shadow-[0_0_50px_rgba(59,130,246,0.3)] ${className}`}
          style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
        >
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
          
          {/* Icon */}
          <div className="relative z-10 mb-6 inline-flex rounded-2xl bg-primary/10 p-4 text-primary ring-1 ring-primary/20 transition-all group-hover:scale-110 group-hover:bg-primary/20 group-hover:ring-primary/40">
            {icon}
          </div>
          
          {/* Content */}
          <div className="relative z-10">
            <h3 className="mb-2 text-2xl font-bold text-white transition-colors group-hover:text-primary">
              {title}
            </h3>
            <p className="text-muted-foreground transition-colors group-hover:text-white/80">
              {description}
            </p>
          </div>
          
          {/* Hover glow effect */}
          <div className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity group-hover:opacity-100">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/20 via-purple-500/20 to-cyan-500/20 blur-xl" />
          </div>
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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-3">
      {/* Large card - Trending (spans 2 columns) */}
      <BentoCard
        title={t.trending.title}
        description={t.trending.description}
        icon={<TrendingUp className="h-8 w-8" />}
        href="/trending"
        className="md:col-span-2 lg:row-span-2"
        delay={0}
      />

      {/* News */}
      <BentoCard
        title={t.news.title}
        description={t.news.description}
        icon={<Globe className="h-8 w-8" />}
        href="/news"
        className="lg:row-span-1"
        delay={0.1}
      />

      {/* Courses */}
      <BentoCard
        title={t.courses.title}
        description={t.courses.description}
        icon={<BookOpen className="h-8 w-8" />}
        href="/courses"
        className="lg:row-span-1"
        delay={0.2}
      />

      {/* Knowledge Graph (tall) */}
      <BentoCard
        title={t.kg.title}
        description={t.kg.description}
        icon={<Brain className="h-8 w-8" />}
        href="/kg"
        className="md:col-span-1 lg:row-span-2"
        delay={0.3}
      />

      {/* Leaderboard */}
      <BentoCard
        title={t.leaderboard.title}
        description={t.leaderboard.description}
        icon={<Award className="h-8 w-8" />}
        href="/leaderboard"
        className="lg:row-span-1"
        delay={0.4}
      />

      {/* Features */}
      <BentoCard
        title={t.features.title}
        description={t.features.description}
        icon={<Zap className="h-8 w-8" />}
        href="/features"
        className="lg:row-span-1"
        delay={0.5}
      />
    </div>
  );
}
