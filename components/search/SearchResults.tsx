'use client';

import { Link } from '@/i18n';
import { ArticleCard } from '@/components/news/ArticleCard';
import { assignFallbackImagesToArticles } from '@/lib/utils/generate-fallback-image';
import { FileText, GraduationCap } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Article {
  id: string;
  title_en: string;
  title_es: string;
  summary_en: string;
  summary_es: string;
  image_url?: string;
  published_at: string;
  category: string;
  ai_generated: boolean;
}

interface Course {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  difficulty: string;
  estimated_hours: number;
}

interface SearchResultsProps {
  results: {
    articles: Article[];
    courses: Course[];
  };
  counts: {
    articles: number;
    courses: number;
    total: number;
  };
  loading: boolean;
  query: string;
  locale: 'en' | 'es';
  onClose: () => void;
}

export function SearchResults({
  results,
  counts,
  loading,
  query,
  locale,
  onClose,
}: SearchResultsProps) {
  const t = useTranslations('search');

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{t('searching')}</p>
      </div>
    );
  }

  if (counts.total === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">
          {t('noResults', { query })}
        </p>
      </div>
    );
  }

  const translations = {
    title: '',
    summary: '',
    readMore: t('readMore', { default: 'Read More' }),
    readTime: '',
    aiGenerated: t('aiGenerated', { default: 'AI Generated' }),
    category: '',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Results Summary */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h3 className="font-semibold">
          {t('resultsCount', { count: counts.total, query })}
        </h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {counts.articles}
          </span>
          <span className="flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            {counts.courses}
          </span>
        </div>
      </div>

      {/* Articles */}
      {results.articles.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('articles')}
          </h4>
          <div className="grid gap-4">
            {assignFallbackImagesToArticles(results.articles, 8).map((article) => (
              <div key={article.id} onClick={onClose}>
                <ArticleCard
                  article={article}
                  locale={locale}
                  translations={translations}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Courses */}
      {results.courses.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            {t('courses')}
          </h4>
          <div className="grid gap-3">
            {results.courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                onClick={onClose}
                className="block p-4 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
              >
                <h5 className="font-medium mb-1">
                  {course[`title_${locale}`] || course.title_en}
                </h5>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {course[`description_${locale}`] || course.description_en}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="capitalize">{course.difficulty}</span>
                  <span>•</span>
                  <span>{course.estimated_hours}h</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
