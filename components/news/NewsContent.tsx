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
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Revolutionary Animated Header */}
      <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 px-4 py-16">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_70%)]" />
        <div className="container relative mx-auto">
          <div className="mb-8 flex items-center gap-3">
            <div className="h-1 w-12 bg-gradient-to-r from-primary to-accent" />
            <span className="text-sm font-bold uppercase tracking-wider text-primary">
              {locale === 'en' ? 'Latest Intelligence' : 'Última Inteligencia'}
            </span>
          </div>
          <h1 className="mb-4 text-5xl font-black tracking-tight md:text-7xl">
            <span className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
              {t('title')}
            </span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            {locale === 'en' 
              ? 'Real-time AI news from the cutting edge. Curated by intelligent agents, verified by experts.'
              : 'Noticias de IA en tiempo real desde la vanguardia. Curadas por agentes inteligentes, verificadas por expertos.'}
          </p>
        </div>
      </section>

      {/* Stats & Insights Section */}
      <section className="border-b border-border/50 bg-gradient-to-b from-background to-muted/30 px-4 py-12">
        <div className="container mx-auto max-w-7xl">
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
