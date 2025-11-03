'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Flame,
  Clock,
  BarChart3,
  Tag,
} from 'lucide-react';
import { ArticleCard } from '@/components/news/ArticleCard';

interface Article {
  id: string;
  title_en: string;
  title_es: string;
  summary_en: string;
  summary_es: string;
  image_url: string;
  published_at: string;
  category: string;
  source_url: string;
  tags: string[];
  ai_generated: boolean;
  quality_score: number;
  reading_time_minutes: number;
}

interface TrendingClientProps {
  trending24h: Article[];
  trending7d: Article[];
  trending30d: Article[];
  topCategories: Array<{ category: string; count: number }>;
  locale: 'en' | 'es';
}

type TimeRange = '24h' | '7d' | '30d';

export function TrendingClient({
  trending24h,
  trending7d,
  trending30d,
  topCategories,
  locale,
}: TrendingClientProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const t = locale === 'en' ? {
    title: 'Trending AI News',
    subtitle: 'Discover the most popular AI content right now',
    hot: 'Hot Topics',
    trending: 'Trending Articles',
    categories: 'Top Categories',
    articles: 'articles',
    range24h: 'Last 24 Hours',
    range7d: 'Last 7 Days',
    range30d: 'Last 30 Days',
  } : {
    title: 'Tendencias en IA',
    subtitle: 'Descubre el contenido de IA más popular ahora',
    hot: 'Temas Candentes',
    trending: 'Artículos en Tendencia',
    categories: 'Categorías Top',
    articles: 'artículos',
    range24h: 'Últimas 24 Horas',
    range7d: 'Últimos 7 Días',
    range30d: 'Últimos 30 Días',
  };

  const getCurrentArticles = () => {
    switch (timeRange) {
      case '24h':
        return trending24h;
      case '7d':
        return trending7d;
      case '30d':
        return trending30d;
      default:
        return trending24h;
    }
  };

  const ranges: Array<{ value: TimeRange; label: string; icon: typeof Clock }> = [
    { value: '24h', label: t.range24h, icon: Flame },
    { value: '7d', label: t.range7d, icon: TrendingUp },
    { value: '30d', label: t.range30d, icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium text-orange-300">{t.hot}</span>
          </div>
          
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </motion.div>

        {/* Time Range Selector */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          {ranges.map((range) => {
            const Icon = range.icon;
            return (
              <motion.button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-medium transition-all ${
                  timeRange === range.value
                    ? 'bg-gradient-to-r from-primary to-cyan-500 text-white shadow-lg shadow-primary/30'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50'
                }`}
              >
                <Icon className="h-5 w-5" />
                {range.label}
              </motion.button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content - Trending Articles */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-cyan-500">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold">{t.trending}</h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {getCurrentArticles().map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ArticleCard 
                    article={article} 
                    locale={locale}
                    translations={{
                      readTime: locale === 'en' ? 'min read' : 'min de lectura',
                      aiGenerated: locale === 'en' ? 'AI Generated' : 'Generado por IA',
                      readMore: locale === 'en' ? 'Read More' : 'Leer Más',
                      category: article.category || (locale === 'en' ? 'AI News' : 'Noticias IA'),
                    }}
                  />
                </motion.div>
              ))}
            </div>

            {getCurrentArticles().length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No trending articles found for this period</p>
              </div>
            )}
          </div>

          {/* Sidebar - Top Categories */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Top Categories Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Tag className="h-5 w-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold">{t.categories}</h3>
                </div>

                <div className="space-y-4">
                  {topCategories.map((category, index) => {
                    const maxCount = topCategories[0]?.count || 1;
                    const percentage = (category.count / maxCount) * 100;
                    
                    return (
                      <motion.div
                        key={category.category}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">
                            {category.category}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {category.count} {t.articles}
                          </span>
                        </div>
                        
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Stats Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 rounded-3xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Flame className="h-6 w-6 text-orange-500" />
                  <span className="font-bold text-orange-300">Trending Stats</span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {getCurrentArticles().length}
                    </div>
                    <div className="text-sm text-orange-300/70">
                      {t.trending}
                    </div>
                  </div>
                  
                  <div className="h-px bg-orange-500/20" />
                  
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {topCategories.length}
                    </div>
                    <div className="text-sm text-orange-300/70">
                      Active Categories
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
