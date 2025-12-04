'use client';

import { motion } from 'framer-motion';
import type { INewsArticle, IArticlePreview } from '@/lib/types/news';
import type { Locale } from '@/i18n';
import { getLocalizedString } from '@/lib/utils/i18n';
import { formatRelativeTimeFromNow } from '@/lib/utils/dates';
import { getImageWithFallback } from '@/lib/utils/generate-fallback-image';
import { GlitchImage } from '@/components/news/GlitchImage';

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

const cardVariants = {
  rest: {
    scale: 1,
    rotateX: 0,
    rotateY: 0,
  },
  hover: {
    scale: 1.02,
    rotateX: 2,
    rotateY: 2,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
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
      variants={cardVariants}
      initial="rest"
      whileHover="hover"
      className="group relative flex flex-col overflow-hidden rounded-3xl backdrop-blur-xl bg-white/5 dark:bg-black/20 border border-white/10 dark:border-white/5 shadow-[0_25px_65px_-35px_rgba(14,15,45,0.75)] transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:shadow-[0_45px_120px_-45px_rgba(104,58,255,0.3)]"
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
    >
      {/* Image with Glitch Effect */}
      <div className="relative h-48 w-full overflow-hidden">
        <GlitchImage
          src={imageUrl}
          alt={title}
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized={imageUrl.startsWith('data:')}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-20" />

        {/* Category + Time badge */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/90 z-20 pointer-events-none">
          <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
            {translations.category}
          </span>
          <span>{relativeTime}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <h3 className="text-xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>

        <p className="flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {summary}
        </p>

        {/* Meta + CTA */}
        <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>
              {translations.readTime.replace(
                '{{minutes}}',
                String(article.reading_time_minutes ?? 5),
              )}
            </span>
            {article.ai_generated && (
              <>
                <span>•</span>
                <span className="text-primary">{translations.aiGenerated}</span>
              </>
            )}
          </div>

          <a
            href={article.source_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary transition-colors hover:text-primary/80"
            onClick={(e) => {
              if (!article.source_url) {
                e.preventDefault();
              }
            }}
          >
            {translations.readMore} →
          </a>
        </div>
      </div>
    </motion.article>
  );
}
