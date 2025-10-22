import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n';
import { detectTrendingTopics } from '@/lib/ai/trending';
import { TrendingPageClient } from '@/components/trending/TrendingPageClient';
import { TrendingGrid } from '@/components/trending/TrendingGrid';

export const dynamic = 'force-dynamic';

export default async function TrendingPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'common' });
  const topics = await detectTrendingTopics(24);
  
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
