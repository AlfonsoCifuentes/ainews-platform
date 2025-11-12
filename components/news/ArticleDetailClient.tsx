'use client';

import { useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ArrowLeft, ExternalLink, Clock, Tag, BookOpen } from 'lucide-react';
import { Link } from '@/i18n';
import { Button } from '@/components/ui/button';
import { BookmarkButton } from '@/components/news/BookmarkButton';
import { RatingStars } from '@/components/news/RatingStars';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { RecommendedArticles } from '@/components/news/RecommendedArticles';
import { useReadingTracker } from '@/lib/hooks/useReadingTracker';
import { formatDate } from '@/lib/utils/format';
import { useTranslations } from 'next-intl';
import { getImageWithFallback } from '@/lib/utils/generate-fallback-image';
import { formatArticleContent, calculateReadingTime } from '@/lib/utils/text-formatter';

interface Article {
  id: string;
  title_en: string;
  title_es: string;
  summary_en: string;
  summary_es: string;
  content_en?: string;
  content_es?: string;
  image_url?: string;
  source_url?: string;
  published_at: string;
  category?: string;
  ai_generated: boolean;
}

interface ArticleDetailClientProps {
  article: Article;
  locale: 'en' | 'es';
}

export function ArticleDetailClient({ article, locale }: ArticleDetailClientProps) {
  const t = useTranslations('common');
  const { scrollDepth } = useReadingTracker({ articleId: article.id });

  const title = article[`title_${locale}`] || article.title_en;
  const summary = article[`summary_${locale}`] || article.summary_en;
  const content = article[`content_${locale}`] || article.content_en;

  // Format content for better readability
  const formattedContent = useMemo(() => {
    return content ? formatArticleContent(content) : '';
  }, [content]);

  // Calculate reading time
  const readingTime = useMemo(() => {
    return content ? calculateReadingTime(content) : 0;
  }, [content]);

  useEffect(() => {
    // Track page view for analytics (ignore umami type)
  }, [article.id]);

  return (
    <article className="space-y-8">
      {/* Back button */}
      <Link href="/news">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('buttons.back', { default: 'Back' })}
        </Button>
      </Link>

      {/* Header */}
      <header className="space-y-6">
        {/* Category & Date */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {article.category && (
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span className="capitalize">{article.category}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <time dateTime={article.published_at}>
              {formatDate(new Date(article.published_at), locale)}
            </time>
          </div>
          {readingTime > 0 && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>{readingTime} {locale === 'es' ? 'min lectura' : 'min read'}</span>
            </div>
          )}
          {article.ai_generated && (
            <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300">
              AI Generated
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold leading-tight bg-gradient-to-br from-white via-white to-gray-400 bg-clip-text text-transparent">
          {title}
        </h1>

        {/* Summary */}
        <p className="text-xl text-muted-foreground leading-relaxed">
          {summary}
        </p>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-4">
          <BookmarkButton articleId={article.id} locale={locale} size="lg" showLabel />
          <RatingStars articleId={article.id} locale={locale} size="lg" />
          {article.source_url && (
            <a href={article.source_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                {t('buttons.readOriginal')}
              </Button>
            </a>
          )}
        </div>
      </header>

      {/* Featured Image */}
      <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-white/10">
        <Image
          src={getImageWithFallback(article.image_url, title, article.category)}
          alt={title}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 1024px) 100vw, 1024px"
          unoptimized={!article.image_url || article.image_url.startsWith('data:')}
        />
      </div>

      {/* Content */}
      {content && (
        <div className="prose prose-invert prose-lg max-w-none">
          <div
            dangerouslySetInnerHTML={{ __html: formattedContent }}
            className="article-content"
          />
        </div>
      )}

      {/* Progress indicator */}
      <div className="sticky bottom-4 left-0 right-0 mx-auto max-w-md">
        <div className="rounded-full bg-white/10 backdrop-blur-xl p-2 shadow-2xl">
          <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
            <span>Reading Progress</span>
            <span className="font-mono">{Math.round(scrollDepth)}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${scrollDepth}%` }}
            />
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="pt-12 border-t border-white/10">
        <CommentsSection articleId={article.id} locale={locale} />
      </div>

      {/* Recommendations */}
      <div className="pt-12 border-t border-white/10">
        <h2 className="text-2xl font-bold mb-6">
          {locale === 'en' ? 'Recommended for You' : 'Recomendado para Ti'}
        </h2>
        <RecommendedArticles locale={locale} limit={6} />
      </div>
    </article>
  );
}
