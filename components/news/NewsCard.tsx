import Link from 'next/link';
import { getLocalizedString } from '@/lib/utils/i18n';
import { formatRelativeTimeFromNow } from '@/lib/utils/dates';
import { getImageWithFallback } from '@/lib/utils/generate-fallback-image';
import { CorroborationBadge } from '@/components/news/CorroborationBadge';
import type { INewsArticle } from '@/lib/types/news';
import type { Locale } from '@/i18n';

type NewsCardProps = {
  article: INewsArticle & { computed_image_url?: string };
  locale: Locale;
  size?: 'default' | 'large';
};

function resolveImage(article: NewsCardProps['article'], title: string): string {
  if (article.computed_image_url && article.computed_image_url.trim() !== '') {
    return article.computed_image_url;
  }
  return getImageWithFallback(article.image_url, title, article.category, article.id);
}

export function NewsCard({ article, locale, size = 'default' }: NewsCardProps) {
  const title = getLocalizedString(article, 'title', locale);
  const summary = getLocalizedString(article, 'summary', locale);
  const isLarge = size === 'large';

  return (
    <Link
      href={`/${locale}/news/${article.id}`}
      className="group flex h-full flex-col border border-white/10 bg-white/[0.015] transition-colors duration-200 hover:border-signal/60"
    >
      <div className={`relative overflow-hidden ${isLarge ? 'aspect-[16/9]' : 'aspect-[16/10]'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveImage(article, title)}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute left-3 top-3">
          <span className="border border-white/25 bg-black/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/85 backdrop-blur-sm">
            {article.category}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3
          className={`font-semibold leading-snug transition-colors group-hover:text-signal-soft ${
            isLarge ? 'line-clamp-3 text-2xl' : 'line-clamp-3 text-lg'
          }`}
        >
          {title}
        </h3>
        {isLarge && summary && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/50">{summary}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
            {formatRelativeTimeFromNow(article.published_at, locale)}
          </span>
          <CorroborationBadge count={article.corroboration_count} locale={locale} variant="outline" />
        </div>
      </div>
    </Link>
  );
}
