"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { type INewsArticle } from '@/lib/types/news';
import { type Locale } from '@/i18n';
import { NewsGridClient } from './NewsGridClient';
import { NewsInsights } from './NewsInsights';
import { NewsStats } from './NewsStats';
import { CategoryFilters } from './CategoryFilters';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

interface NewsContentProps {
  initialArticles: INewsArticle[];
  locale: Locale;
}

export function NewsContent({ initialArticles, locale }: NewsContentProps) {
  const t = useTranslations('news');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-[#020309] pt-28">
      {/* Brutalist Header */}
      <section className="py-24 border-t border-[#1F1F1F] relative z-10">
        <div className="px-6 md:px-12 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-sm font-mono tracking-widest text-[#888888]">
              01 — {locale === 'en' ? 'LATEST NEWS' : 'ÚLTIMAS NOTICIAS'}
            </h2>
          </div>
          <div className="h-px w-24 bg-white/50 mb-8" />
          
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">
            {t('title')}
          </h1>
          <p className="max-w-2xl text-lg text-[#888888] font-mono">
            {locale === 'en' 
              ? 'Real-time AI news from the cutting edge. Curated by intelligent agents, verified by experts.'
              : 'Noticias de IA en tiempo real desde la vanguardia. Curadas por agentes inteligentes, verificadas por expertos.'}
          </p>
        </div>
      </section>

      {/* Stats & Insights Section */}
      <section className="border-t border-[#1F1F1F] bg-[#0A0A0A] px-6 md:px-12 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Stats - Full width */}
          <div className="mb-8">
            <NewsStats locale={locale} />
          </div>

          {/* Three Insights Cards - Equal width */}
          <ErrorBoundary componentName="NewsInsights">
            <NewsInsights locale={locale} />
          </ErrorBoundary>
        </div>
      </section>

      {/* Category Filters - Full width strip */}
      <CategoryFilters 
        locale={locale} 
        onCategoryFilter={setActiveCategory}
      />

      <NewsGridClient 
        initialArticles={initialArticles} 
        locale={locale} 
        activeCategory={activeCategory}
      />
    </main>
  );
}
