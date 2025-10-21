'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { getLocalizedString } from '@/lib/utils/i18n';

interface SavedArticlesProps {
  articles: Array<{
    saved_at: string;
    news_articles: {
      id: string;
      title_en: string;
      title_es: string;
      image_url: string;
      category: string;
    };
  }>;
  locale: 'en' | 'es';
  translations: {
    title: string;
  };
}

export function SavedArticles({ articles, locale, translations }: SavedArticlesProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
      <h2 className="text-2xl font-bold mb-4">{translations.title}</h2>

      {articles.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {locale === 'en'
            ? 'Save articles to read later!'
            : '¡Guarda artículos para leer más tarde!'}
        </p>
      ) : (
        <div className="space-y-3">
          {articles.slice(0, 5).map((item, index) => (
            <motion.div
              key={item.news_articles.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={`/${locale}/news/${item.news_articles.id}`}
                className="flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
              >
                <Image
                  src={item.news_articles.image_url}
                  alt=""
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-clamp-2 mb-1">
                    {getLocalizedString(item.news_articles, 'title', locale)}
                  </h3>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                    {item.news_articles.category}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}

          {articles.length > 5 && (
            <Link
              href={`/${locale}/dashboard/saved`}
              className="block text-center text-sm text-primary hover:underline mt-4"
            >
              {locale === 'en' ? 'View All' : 'Ver Todos'} ({articles.length})
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
