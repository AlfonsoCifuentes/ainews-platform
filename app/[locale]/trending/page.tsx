import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n';
import { detectTrendingTopics } from '@/lib/ai/trending';
import { TrendingPageClient } from '@/components/trending/TrendingPageClient';
import { TrendingGrid } from '@/components/trending/TrendingGrid';
import type { TrendingTopic } from '@/lib/ai/trending';

export const dynamic = 'force-dynamic';

export default async function TrendingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  
  let topics: TrendingTopic[] = [];
  try {
    topics = await detectTrendingTopics(24);
  } catch (error) {
    console.error('Failed to fetch trending topics:', error);
  }
  
  return (
    <TrendingPageClient
      title="🔥 Trending Topics"
      subtitle="Topics with the highest momentum in the last 24 hours"
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
