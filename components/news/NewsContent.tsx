"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { type INewsArticle } from '@/lib/types/news';
import { type Locale } from '@/i18n';
import { NewsGridClient } from './NewsGridClient';
import { NewsStats } from './NewsStats';
import { CategoryFilters } from './CategoryFilters';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { NewsPodcastWidget } from './NewsPodcastWidget';

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
      <section className="border-t border-[#1F1F1F] bg-[#0A0A0A] px-4 md:px-8 py-4">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-3">
            <ErrorBoundary componentName="NewsPodcastWidget">
              <NewsPodcastWidget locale={locale} />
            </ErrorBoundary>

            <NewsStats locale={locale} />
          </div>
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
