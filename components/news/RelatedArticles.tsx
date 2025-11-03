'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ArticleCard } from '@/components/news/ArticleCard';
import type { IArticlePreview } from '@/lib/types/news';
import type { Locale } from '@/i18n';

interface RelatedArticlesProps {
  articleId: string;
  locale: Locale;
  translations: {
    title: string;
    readTime: string;
    aiGenerated: string;
    readMore: string;
    category: string;
  };
}

export function RelatedArticles({
  articleId,
  locale,
  translations,
}: RelatedArticlesProps) {
  const [articles, setArticles] = useState<IArticlePreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRelatedArticles = async () => {
      try {
        const response = await fetch(
          `/api/news/related?articleId=${articleId}&locale=${locale}&limit=3`
        );
        const data = await response.json();
        if (response.ok) {
          setArticles(data.data || []);
        }
      } catch (error) {
        console.error('Failed to load related articles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRelatedArticles();
  }, [articleId, locale]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          <h2 className="text-2xl font-bold">{translations.title}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-96 rounded-3xl bg-white/5 border border-white/10 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold">{translations.title}</h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {articles.map((article, index) => (
          <motion.div
            key={article.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <ArticleCard article={article} locale={locale} translations={translations} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
