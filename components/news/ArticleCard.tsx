'use client';

import Image from 'next/image';
import type { INewsArticle, IArticlePreview } from '@/lib/types/news';
import type { Locale } from '@/i18n';
import { getLocalizedString } from '@/lib/utils/i18n';
import { formatRelativeTimeFromNow } from '@/lib/utils/dates';
import { getImageWithFallback } from '@/lib/utils/generate-fallback-image';

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
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-white/12 bg-[#050505]"
    >
      <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={imageUrl}
          alt={title}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized={imageUrl.startsWith('data:')}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] group-hover:rotate-0.25"
        />

        {/* Old-TV hover interference */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-60"
          style={{
            mixBlendMode: 'screen',
            backgroundImage: `
              repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 3px),
              repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 2px, transparent 2px, transparent 4px),
              radial-gradient(circle at 10% 20%, rgba(255,255,255,0.08) 0 10%, transparent 20%),
              radial-gradient(circle at 80% 0%, rgba(0,150,255,0.12) 0 14%, transparent 26%)
            `,
            backgroundSize: '120% 100%, 100% 120%, 120% 120%, 140% 140%',
            animation: 'tvNoise 1.2s steps(6) infinite, tvShift 3s ease-in-out infinite',
          }}
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
        <h3 className="text-xl font-semibold leading-tight text-white">
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
            className="font-semibold text-white tracking-[0.12em] uppercase text-xs border-b border-white/30"
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

      <style jsx>{`
        @keyframes tvNoise {
          0% { background-position: 0 0, 0 0, 0 0, 0 0; filter: hue-rotate(0deg) contrast(1); }
          25% { background-position: 5% 10%, 0 2%, 10% 5%, -4% 3%; filter: hue-rotate(3deg) contrast(1.05); }
          50% { background-position: -6% -8%, 0 -3%, -8% -6%, 6% -4%; filter: hue-rotate(-2deg) contrast(1.08); }
          75% { background-position: 3% -4%, 0 1%, 6% -2%, -2% 5%; filter: hue-rotate(2deg) contrast(1.02); }
          100% { background-position: 0 0, 0 0, 0 0, 0 0; filter: hue-rotate(0deg) contrast(1); }
        }

        @keyframes tvShift {
          0% { transform: translate3d(0, 0, 0) skewX(0deg); }
          35% { transform: translate3d(0, -1px, 0) skewX(-0.2deg); }
          60% { transform: translate3d(0, 1px, 0) skewX(0.25deg); }
          100% { transform: translate3d(0, 0, 0) skewX(0deg); }
        }
      `}</style>
    </article>
  );
}
