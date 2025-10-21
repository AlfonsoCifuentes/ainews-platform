"use client";

import { useTranslations } from 'next-intl';

export default function CoursesPage() {
  const t = useTranslations('courses');

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="container mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">{t('title')}</h1>

        {/* Course Generator CTA */}
        <div className="glass p-8 rounded-3xl mb-12 text-center">
          <h2 className="text-2xl font-bold mb-4">
            {t('generator.title')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('generator.subtitle')}
          </p>
          <button className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:scale-105 transition-transform">
            {t('generator.generateButton')}
          </button>
        </div>

        {/* Placeholder for courses grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-3xl">
            <div className="bg-muted rounded-xl h-32 mb-4"></div>
            <h3 className="text-xl font-bold mb-2">Sample Course Title</h3>
            <p className="text-muted-foreground mb-4">Sample description...</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('catalog.beginner')}</span>
              <span className="text-sm">2h 30min</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
