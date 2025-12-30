'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Info } from 'lucide-react';
import { ArticleCard } from '../news/ArticleCard';
import type { IArticlePreview } from '@/lib/types/news';
import { assignFallbackImagesToArticles } from '@/lib/utils/generate-fallback-image';

interface Recommendation {
  content_id: string;
  score: number;
  reasoning: string[];
  content: IArticlePreview;
}

interface PersonalizedFeedProps {
  userId: string;
  locale: 'en' | 'es';
  contentType: 'article' | 'course';
  limit?: number;
}

export default function PersonalizedFeed({ userId, locale, contentType, limit = 6 }: PersonalizedFeedProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExplanations, setShowExplanations] = useState(false);

  useEffect(() => {
    fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, contentType]);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(
        `/api/recommendations?userId=${userId}&contentType=${contentType}&limit=${limit}`
      );
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Note: Interaction tracking (like, bookmark) can be added later
  // by extending ArticleCard with interaction buttons and calling:
  // POST /api/recommendations with { userId, contentType, contentId, interactionType }

  const recommendationsWithSpacedFallbacks = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return recommendations;
    const contents = recommendations.map((rec) => rec.content);
    const enrichedContents = assignFallbackImagesToArticles(contents, 8);
    const byId = new Map(enrichedContents.map((a) => [a.id, a] as const));
    return recommendations.map((rec) => ({
      ...rec,
      content: byId.get(rec.content.id) ?? rec.content,
    }));
  }, [recommendations]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 bg-white/10 rounded-3xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          {locale === 'en'
            ? 'Start exploring content to get personalized recommendations!'
            : '¡Comienza a explorar contenido para obtener recomendaciones personalizadas!'}
        </p>
      </div>
    );
  }

  const feedTranslations = {
    en: {
      forYou: 'Recommended For You',
      whyThis: 'Why this?',
      hideReasons: 'Hide reasons'
    },
    es: {
      forYou: 'Recomendado Para Ti',
      whyThis: '¿Por qué esto?',
      hideReasons: 'Ocultar razones'
    }
  };

  const articleTranslations = {
    readTime: locale === 'en' ? 'min read' : 'min lectura',
    aiGenerated: locale === 'en' ? 'AI Generated' : 'Generado por IA',
    readMore: locale === 'en' ? 'Read More' : 'Leer Más',
    category: locale === 'en' ? 'Category' : 'Categoría'
  };

  const t = feedTranslations[locale];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-6 h-6 text-primary" />
          </motion.div>
          <h2 className="text-2xl font-bold">{t.forYou}</h2>
        </div>

        <button
          onClick={() => setShowExplanations(!showExplanations)}
          className="text-sm text-primary hover:underline flex items-center gap-2"
        >
          <Info className="w-4 h-4" />
          {showExplanations ? t.hideReasons : t.whyThis}
        </button>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendationsWithSpacedFallbacks.map((rec, index) => (
          <motion.div
            key={rec.content_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            {/* AI Badge */}
            <div className="absolute top-4 left-4 z-10 bg-gradient-to-r from-primary to-accent text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI Pick
            </div>

            <ArticleCard
              article={rec.content}
              locale={locale}
              translations={articleTranslations}
            />

            {/* Explanation */}
            {showExplanations && rec.reasoning.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 p-3 bg-white/5 rounded-xl border border-white/10"
              >
                <p className="text-xs text-muted-foreground mb-1 font-semibold">
                  {locale === 'en' ? 'Why recommended:' : 'Por qué recomendado:'}
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {rec.reasoning.slice(0, 3).map((reason, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
