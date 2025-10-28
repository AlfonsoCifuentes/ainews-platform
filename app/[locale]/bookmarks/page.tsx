import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { BookmarksClient } from '@/components/news/BookmarksClient';

type BookmarksPageProps = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: BookmarksPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'bookmarks' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function BookmarksPage({ params }: BookmarksPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'bookmarks' });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold md:text-6xl bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          {t('title')}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('subtitle')}
        </p>
      </div>

      <Suspense fallback={<div className="text-center">Loading...</div>}>
        <BookmarksClient locale={locale} />
      </Suspense>
    </div>
  );
}
