import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { FlashcardReviewer } from '@/components/shared/FlashcardReviewer';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'flashcards' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      languages: {
        en: '/en/flashcards',
        es: '/es/flashcards',
      },
    },
  };
}

export default async function FlashcardsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: 'flashcards' });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <FlashcardReviewer />
    </main>
  );
}
