import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n';
import { detectTrendingTopics } from '@/lib/ai/trending';

export const dynamic = 'force-dynamic';

export default async function TrendingPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'common' });
  const topics = await detectTrendingTopics(24);
  
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">🔥 Trending Topics</h1>
      <p className="text-muted-foreground mb-8">
        Topics with the highest momentum in the last 24 hours
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topics.map((topic, i) => (
          <Link
            key={topic.topic}
            href={`/search?q=${encodeURIComponent(topic.topic)}`}
            className="group rounded-2xl border p-5 backdrop-blur-xl bg-card/60 hover:bg-card transition-all duration-300 hover:shadow-xl"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                #{i + 1}
              </span>
              <span className="text-xs font-medium text-primary">
                {topic.count} mentions
              </span>
            </div>
            
            <h3 className="text-lg font-semibold mb-2 capitalize group-hover:text-primary transition-colors">
              {topic.topic}
            </h3>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                📈 {topic.momentum.toFixed(2)} mentions/hr
              </span>
            </div>
          </Link>
        ))}
      </div>
      
      {topics.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No trending topics found. Check back later!
        </div>
      )}
      
      <div className="mt-8 text-sm text-muted-foreground">
        <Link href="/">← {t('nav.home')}</Link>
      </div>
    </main>
  );
}
