import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n';
import { getTrendingTopicsFromCache } from '@/lib/ai/trending';
import { TrendingPageClient } from '@/components/trending/TrendingPageClient';
import { TrendingGrid } from '@/components/trending/TrendingGrid';
import type { TrendingTopic } from '@/lib/ai/trending';

export const dynamic = 'force-dynamic';
export const revalidate = 21600; // Revalidar cada 6 horas (matching GitHub Action)

export default async function TrendingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  
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
    <TrendingPageClient
      title="🔥 Trending Topics"
      subtitle={
        lastUpdate 
          ? `Updated automatically every 6 hours • Last update: ${lastUpdate.toLocaleString(locale)}`
          : "Topics with the highest momentum in the last 24 hours"
      }
    >
      <TrendingGrid 
        topics={topics} 
        noResults="No trending topics found. Check back later!" 
      />
      
      <div className="mt-8 text-sm text-muted-foreground">
        <Link href="/">← {t('nav.home')}</Link>
      </div>
    </TrendingPageClient>
  );
}
