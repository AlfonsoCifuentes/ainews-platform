"use client";

import { useTranslations } from 'next-intl';

export default function NewsPage() {
  const t = useTranslations('news');

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="container mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">{t('title')}</h1>
        
        {/* Filters */}
        <div className="mb-8 flex gap-4 flex-wrap">
          <button className="px-4 py-2 rounded-full bg-primary text-primary-foreground">
            {t('categories.all')}
          </button>
          <button className="px-4 py-2 rounded-full glass hover:scale-105 transition-transform">
            {t('categories.machinelearning')}
          </button>
          <button className="px-4 py-2 rounded-full glass hover:scale-105 transition-transform">
            {t('categories.nlp')}
          </button>
          <button className="px-4 py-2 rounded-full glass hover:scale-105 transition-transform">
            {t('categories.computervision')}
          </button>
        </div>

        {/* Placeholder for news grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-3xl">
            <div className="bg-muted rounded-xl h-48 mb-4"></div>
            <h3 className="text-xl font-bold mb-2">Sample News Title</h3>
            <p className="text-muted-foreground">Sample description...</p>
          </div>
        </div>
      </div>
    </main>
  );
}
