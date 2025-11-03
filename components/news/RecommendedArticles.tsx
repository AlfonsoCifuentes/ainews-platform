"use client";

import { motion } from 'framer-motion';
import { useRecommendations } from '@/lib/hooks/useRecommendations';
import { ArticleCard } from '@/components/news/ArticleCard';
import { Sparkles, Loader2 } from 'lucide-react';

interface RecommendedArticlesProps {
  locale: 'en' | 'es';
  limit?: number;
}

export function RecommendedArticles({ locale, limit = 6 }: RecommendedArticlesProps) {
  const { recommendations, reason, isLoading } = useRecommendations(locale, limit);

  const translations = {
    en: {
      title: 'Recommended for You',
      subtitle: reason || 'Personalized based on your interests',
      readTime: 'min read',
      aiGenerated: 'AI Generated',
      readMore: 'Read More',
      category: 'Category',
    },
    es: {
      title: 'Recomendado para Ti',
      subtitle: reason || 'Personalizado según tus intereses',
      readTime: 'min de lectura',
      aiGenerated: 'Generado por IA',
      readMore: 'Leer Más',
      category: 'Categoría',
    },
  }[locale];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center gap-3"
        >
          <Sparkles className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{translations.title}</h2>
            <p className="text-sm text-muted-foreground">{translations.subtitle}</p>
          </div>
        </motion.div>

        {/* Articles Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recommendations.map((article, index) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <ArticleCard 
                article={article} 
                locale={locale} 
                translations={{
                  readTime: translations.readTime,
                  aiGenerated: translations.aiGenerated,
                  readMore: translations.readMore,
                  category: translations.category,
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
