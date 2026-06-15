import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n';
import { fetchLatestNews, fetchTopStories } from '@/lib/db/news';
import { getLocalizedString } from '@/lib/utils/i18n';
import { formatRelativeTimeFromNow } from '@/lib/utils/dates';
import { getImageWithFallback } from '@/lib/utils/generate-fallback-image';
import { AI_NEWS_SOURCES } from '@/lib/ai/news-sources';
import { SITE_NAME, siteTagline } from '@/lib/config/site';
import { CorroborationBadge } from '@/components/news/CorroborationBadge';
import type { INewsArticle } from '@/lib/types/news';

type HomePageProps = {
  params: Promise<{ locale: Locale }>;
};

export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

function articleImage(article: INewsArticle & { computed_image_url?: string }, title: string): string {
  if (article.computed_image_url && article.computed_image_url.trim() !== '') {
    return article.computed_image_url;
  }
  return getImageWithFallback(article.image_url, title, article.category, article.id);
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Top stories are ranked by multi-source corroboration (importance), with each
  // story collapsed to one representative article. The "Latest" rail stays
  // chronological. Falls back gracefully before the clustering job has run.
  const [topStories, latest] = await Promise.all([
    fetchTopStories({ locale, limit: 5 }),
    fetchLatestNews({ locale, limit: 16 }),
  ]);

  const ranked = topStories.length > 0 ? topStories : latest;
  const lead = ranked[0];
  const secondary = ranked.slice(1, 3);

  const shownIds = new Set([lead?.id, ...secondary.map((a) => a.id)].filter(Boolean));
  const rest = latest.filter((a) => !shownIds.has(a.id)).slice(0, 10);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#04050a] text-white">
      {/* faint grid backdrop */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* HERO */}
      <section className="relative px-5 pt-32 pb-16 md:px-12 md:pt-40">
        <div className="mx-auto max-w-7xl">
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-signal">
            {SITE_NAME} — {AI_NEWS_SOURCES.length}+ {locale === 'es' ? 'fuentes' : 'sources'}
          </p>
          <h1 className="max-w-4xl text-4xl font-black leading-[1.05] tracking-tight md:text-7xl">
            {siteTagline(locale)}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/60">
            {locale === 'es'
              ? 'Las noticias de IA más importantes del día, contrastadas entre decenas de medios y explicadas con claridad.'
              : "The day's most important AI stories, cross-checked across dozens of outlets and explained clearly."}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={`/${locale}/news`}
              className="bg-white px-8 py-3 text-xs font-mono uppercase tracking-[0.2em] text-black transition-colors hover:bg-signal hover:text-white"
            >
              {locale === 'es' ? 'Ver noticias' : 'Read the news'}
            </Link>
            <Link
              href={`/${locale}/trending`}
              className="border border-white/20 px-8 py-3 text-xs font-mono uppercase tracking-[0.2em] text-white transition-colors hover:border-white"
            >
              {locale === 'es' ? 'Tendencias' : 'Trending'}
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      {lead && (
        <section className="relative px-5 pb-20 md:px-12">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.6fr_1fr]">
            {/* lead story */}
            <Link href={`/${locale}/news/${lead.id}`} className="group relative block overflow-hidden border border-white/10">
              <div className="relative aspect-[16/10] min-h-[340px] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={articleImage(lead, getLocalizedString(lead, 'title', locale))}
                  alt={getLocalizedString(lead, 'title', locale)}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              </div>
              <div className="absolute bottom-0 p-7">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-block border border-white/25 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/80">
                    {lead.category}
                  </span>
                  <CorroborationBadge count={lead.corroboration_count} locale={locale} />
                </div>
                <h2 className="max-w-xl text-2xl font-bold leading-tight md:text-4xl">
                  {getLocalizedString(lead, 'title', locale)}
                </h2>
                <p className="mt-2 font-mono text-xs text-white/50">
                  {formatRelativeTimeFromNow(lead.published_at, locale)}
                </p>
              </div>
            </Link>

            {/* secondary stories — text-forward, stacked */}
            <div className="grid grid-rows-2 gap-6">
              {secondary.map((article) => {
                const title = getLocalizedString(article, 'title', locale);
                return (
                  <Link
                    key={article.id}
                    href={`/${locale}/news/${article.id}`}
                    className="group flex min-h-[160px] flex-col justify-between border border-white/10 bg-white/[0.015] p-5 transition-colors hover:border-signal/60"
                  >
                    <div>
                      <span className="mb-3 block font-mono text-[10px] uppercase tracking-[0.2em] text-signal-soft">
                        {article.category}
                      </span>
                      <h3 className="line-clamp-3 text-lg font-semibold leading-snug transition-colors group-hover:text-signal-soft">
                        {title}
                      </h3>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">
                        {formatRelativeTimeFromNow(article.published_at, locale)}
                      </span>
                      <CorroborationBadge count={article.corroboration_count} locale={locale} variant="outline" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* LATEST LIST */}
      {rest.length > 0 && (
        <section className="relative px-5 pb-28 md:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex items-end justify-between border-b border-white/10 pb-4">
              <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-white/60">
                {locale === 'es' ? 'Lo último' : 'Latest'}
              </h2>
              <Link href={`/${locale}/news`} className="font-mono text-xs uppercase tracking-[0.2em] text-signal hover:text-white">
                {locale === 'es' ? 'Ver todo →' : 'View all →'}
              </Link>
            </div>
            <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
              {rest.map((article) => {
                const title = getLocalizedString(article, 'title', locale);
                return (
                  <Link
                    key={article.id}
                    href={`/${locale}/news/${article.id}`}
                    className="group flex gap-4 border-b border-white/5 pb-6"
                  >
                    <div className="relative h-20 w-28 shrink-0 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={articleImage(article, title)}
                        alt={title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                        {article.category} · {formatRelativeTimeFromNow(article.published_at, locale)}
                      </span>
                      <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug group-hover:text-signal">
                        {title}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
