import { getTrendingTopicsFromCache } from '@/lib/ai/trending';
import { TrendingBoard } from '@/components/trending/TrendingBoard';
import { SITE_NAME } from '@/lib/config/site';
import type { TrendingTopic } from '@/lib/ai/trending';

export const dynamic = 'force-dynamic';
export const revalidate = 21600; // every 6h, matching the GitHub Action

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: `${locale === 'es' ? 'Tendencias' : 'Trending'} · ${SITE_NAME}`,
    description:
      locale === 'es'
        ? 'Los temas de IA con más impulso en las últimas horas.'
        : 'The AI topics with the most momentum in the last hours.',
  };
}

export default async function TrendingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEs = locale === 'es';

  let topics: TrendingTopic[] = [];
  let lastUpdate: Date | null = null;
  try {
    const result = await getTrendingTopicsFromCache();
    topics = result.topics;
    lastUpdate = result.lastUpdate;
  } catch (error) {
    console.error('Failed to fetch trending topics:', error);
  }

  return (
    <main className="relative min-h-screen bg-[#04050a] px-5 pb-28 pt-32 text-white md:px-12 md:pt-40">
      <div className="mx-auto max-w-4xl">
        <header className="mb-12">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-signal">
            {isEs ? 'Tendencias' : 'Trending'}
          </p>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            {isEs ? 'Lo que más se mueve' : "What's moving most"}
          </h1>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-white/40">
            {lastUpdate
              ? `${isEs ? 'Actualizado' : 'Updated'} ${lastUpdate.toLocaleString(locale)}`
              : isEs
                ? 'Temas con más impulso en las últimas 24 h'
                : 'Topics with the most momentum in the last 24h'}
          </p>
        </header>

        <TrendingBoard topics={topics} locale={locale} />
      </div>
    </main>
  );
}
