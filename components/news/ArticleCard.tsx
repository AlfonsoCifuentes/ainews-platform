'use client';

import { motion } from 'framer-motion';
import type { INewsArticle, IArticlePreview } from '@/lib/types/news';
import type { Locale } from '@/i18n';
import { getLocalizedString } from '@/lib/utils/i18n';
import { formatRelativeTimeFromNow } from '@/lib/utils/dates';
import { getImageWithFallback } from '@/lib/utils/generate-fallback-image';
import { CCTVGlitchImage } from '@/components/shared/CCTVGlitchImage';

type ArticleCardProps = {
  article: INewsArticle | IArticlePreview;
  locale: Locale;
  priority?: boolean;
  translations: {
    readTime: string;
    aiGenerated: string;
    readMore: string;
    category: string;
  };
};

export function ArticleCard({
  article,
  locale,
  priority = false,
  translations,
}: ArticleCardProps) {
  const title = getLocalizedString(article, 'title', locale);
  const summary = getLocalizedString(article, 'summary', locale);
  const relativeTime = formatRelativeTimeFromNow(article.published_at, locale);
  
  // Generar imagen con fallback automático si no hay imagen
  const imageUrl = getImageWithFallback(
    article.image_url,
    title,
    article.category
  );

  return (
    <motion.article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-white/12 bg-[#050505] transition-all duration-300"
    >
      {/* Image with Glitch Effect */}
      <div className="relative h-48 w-full overflow-hidden">
        <CCTVGlitchImage
          src={imageUrl}
          alt={title}
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized={imageUrl.startsWith('data:')}
        />

        {/* Category + Time badge */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.18em] text-white z-20 pointer-events-none">
          <span className="border border-white/30 bg-black/40 px-3 py-1">
            {translations.category}
          </span>
          <span className="text-white/70">{relativeTime}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <h3 className="text-xl font-semibold leading-tight text-white transition-colors">
          {title}
        </h3>

        <p className="flex-1 text-sm leading-relaxed text-white/65 line-clamp-3">
          {summary}
        </p>

        {/* Meta + CTA */}
        <div className="flex items-center justify-between border-t border-white/12 pt-4 text-sm text-white/70">
          <div className="flex items-center gap-3">
            <span>
              {translations.readTime.replace(
                '{{minutes}}',
                String(article.reading_time_minutes ?? 5),
              )}
            </span>
            {article.ai_generated && (
              <>
                <span>•</span>
                <span className="text-white">{translations.aiGenerated}</span>
              </>
            )}
          </div>

          <a
            href={article.source_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white tracking-[0.12em] uppercase text-xs border-b border-transparent hover:border-white"
            onClick={(e) => {
              if (!article.source_url) {
                e.preventDefault();
              }
            }}
          >
            {translations.readMore}
          </a>
        </div>
      </div>
    </motion.article>
  );
}
