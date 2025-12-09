/**
 * Enhanced Article Card simplified without tilt or glitch effects
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, TrendingUp, Bookmark, Share2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { getLocalizedField } from '@/lib/utils/i18n';
import type { INewsArticle } from '@/lib/types/news';

interface EnhancedArticleCardProps {
  article: INewsArticle;
  locale: 'en' | 'es';
  priority?: boolean;
  onBookmark?: (id: string) => void;
  onShare?: (article: INewsArticle) => void;
  isBookmarked?: boolean;
}

export default function EnhancedArticleCard({
  article,
  locale,
  priority = false,
  onBookmark,
  onShare,
  isBookmarked = false,
}: EnhancedArticleCardProps) {
  const title = getLocalizedField(article, 'title', locale) as string;
  const summary = getLocalizedField(article, 'summary', locale) as string;
  const readingTime = Math.ceil((summary?.length || 0) / 200); // ~200 chars per minute

  return (
    <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 shadow-lg">
      <Link href={`/${locale}/news/${article.id}`} className="block">
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={article.image_url || '/placeholder-news.jpg'}
            alt={title}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-70 pointer-events-none" />

          {('trending_score' in article && (article as { trending_score: number }).trending_score > 0.7) && (
            <div className="absolute top-4 right-4 z-30">
              <Badge variant="default" className="flex items-center gap-1 backdrop-blur-md">
                <TrendingUp className="w-3 h-3" />
                {locale === 'en' ? 'Trending' : 'Tendencia'}
              </Badge>
            </div>
          )}

          {article.category && (
            <div className="absolute top-4 left-4 z-30">
              <Badge
                variant="secondary"
                className="backdrop-blur-md bg-white/20 text-white border-white/30"
              >
                {article.category}
              </Badge>
            </div>
          )}
        </div>
      </Link>

      <div className="p-6 space-y-4">
        <Link href={`/${locale}/news/${article.id}`}>
          <h3 className="text-2xl font-bold leading-tight line-clamp-2 text-white">
            {title}
          </h3>
        </Link>

        <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
          {summary}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>
                {readingTime} {locale === 'en' ? 'min read' : 'min lectura'}
              </span>
            </div>

            {article.published_at && (
              <span>
                {new Date(article.published_at).toLocaleDateString(
                  locale === 'en' ? 'en-US' : 'es-ES',
                  { month: 'short', day: 'numeric' }
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onBookmark && (
              <button
                className={`p-2 rounded-full backdrop-blur-md ${
                  isBookmarked
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/10 text-white'
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  onBookmark(article.id);
                }}
                aria-label={locale === 'en' ? 'Bookmark' : 'Guardar'}
              >
                <Bookmark
                  className="w-4 h-4"
                  fill={isBookmarked ? 'currentColor' : 'none'}
                />
              </button>
            )}

            {onShare && (
              <button
                className="p-2 rounded-full backdrop-blur-md bg-white/10 text-white"
                onClick={(e) => {
                  e.preventDefault();
                  onShare(article);
                }}
                aria-label={locale === 'en' ? 'Share' : 'Compartir'}
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {article.source_url && (
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full backdrop-blur-md bg-white/10 text-white"
                onClick={(e) => e.stopPropagation()}
                aria-label={locale === 'en' ? 'View source' : 'Ver fuente'}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
