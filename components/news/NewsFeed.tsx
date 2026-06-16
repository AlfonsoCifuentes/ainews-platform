'use client';

import { useMemo, useState } from 'react';
import { NewsCard } from '@/components/news/NewsCard';
import { assignFallbackImagesToArticles } from '@/lib/utils/generate-fallback-image';
import type { INewsArticle } from '@/lib/types/news';
import type { Locale } from '@/i18n';

type NewsFeedProps = {
  articles: INewsArticle[];
  locale: Locale;
};

const CATEGORY_LABELS: Record<string, { en: string; es: string }> = {
  all: { en: 'All', es: 'Todo' },
  machinelearning: { en: 'Machine Learning', es: 'Machine Learning' },
  nlp: { en: 'NLP', es: 'PLN' },
  computervision: { en: 'Computer Vision', es: 'Visión' },
  robotics: { en: 'Robotics', es: 'Robótica' },
  ethics: { en: 'Ethics', es: 'Ética' },
  business: { en: 'Business', es: 'Negocio' },
  research: { en: 'Research', es: 'Investigación' },
  tools: { en: 'Tools', es: 'Herramientas' },
  news: { en: 'News', es: 'Noticias' },
  other: { en: 'Other', es: 'Otros' },
};

function labelFor(category: string, locale: string): string {
  const key = category?.toLowerCase().replace(/\s+/g, '') || 'other';
  const entry = CATEGORY_LABELS[key];
  if (entry) return locale === 'es' ? entry.es : entry.en;
  return category;
}

export function NewsFeed({ articles, locale }: NewsFeedProps) {
  const [active, setActive] = useState<string>('all');

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) {
      const key = a.category?.toLowerCase().replace(/\s+/g, '') || 'other';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return ['all', ...Array.from(counts.keys()).sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))];
  }, [articles]);

  const filtered = useMemo(() => {
    if (active === 'all') return articles;
    return articles.filter((a) => (a.category?.toLowerCase().replace(/\s+/g, '') || 'other') === active);
  }, [articles, active]);

  // Assign fallback photos round-robin (in display order) so consecutive cards
  // never share the same fallback.
  const withImages = useMemo(() => assignFallbackImagesToArticles(filtered), [filtered]);
  const [lead, ...rest] = withImages;

  return (
    <div className="relative min-h-screen bg-[#04050a] px-5 pb-28 pt-28 text-white md:px-12 md:pt-36">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-signal">
            {locale === 'es' ? 'Noticias de IA' : 'AI News'}
          </p>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            {locale === 'es' ? 'Todo lo que importa, hoy' : "Everything that matters, today"}
          </h1>
        </header>

        {/* category filter rail */}
        <div className="mb-10 flex flex-wrap gap-2 border-b border-white/10 pb-5">
          {categories.map((cat) => {
            const isActive = active === cat;
            return (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                  isActive
                    ? 'border-signal bg-signal text-white'
                    : 'border-white/15 text-white/55 hover:border-white/40 hover:text-white'
                }`}
              >
                {labelFor(cat, locale)}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <p className="py-20 text-center font-mono text-sm uppercase tracking-[0.2em] text-white/40">
            {locale === 'es' ? 'Sin artículos en esta categoría' : 'No articles in this category'}
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {lead && (
              <div className="md:col-span-2 lg:col-span-3">
                <NewsCard article={lead} locale={locale} size="large" />
              </div>
            )}
            {rest.map((article) => (
              <NewsCard key={article.id} article={article} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
