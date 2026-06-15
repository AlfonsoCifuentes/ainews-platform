import { setRequestLocale } from 'next-intl/server';
import { AdvancedSearch } from '@/components/search/AdvancedSearch';
import { SITE_NAME } from '@/lib/config/site';
import type { Locale } from '@/i18n';

interface SearchPageProps {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    q?: string;
  }>;
}

export async function generateMetadata({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  const sp = await searchParams;
  const query = sp.q || '';

  return {
    title: query
      ? `${locale === 'en' ? 'Search' : 'Buscar'}: ${query} · ${SITE_NAME}`
      : `${locale === 'en' ? 'Search' : 'Buscar'} · ${SITE_NAME}`,
    description:
      locale === 'en'
        ? 'Search AI news with advanced filters and semantic search.'
        : 'Busca noticias de IA con filtros avanzados y búsqueda semántica.',
  };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const initialQuery = sp.q || '';

  return (
    <main className="min-h-screen bg-[#04050a] px-5 pb-16 pt-32 md:px-12 md:pt-36">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-signal">
            {locale === 'en' ? 'Search' : 'Buscar'}
          </p>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            {locale === 'en' ? 'Find any AI story' : 'Encuentra cualquier noticia'}
          </h1>
          <p className="mt-4 text-lg text-white/60">
            {locale === 'en'
              ? 'Search across the news with semantic matching and filters.'
              : 'Busca en las noticias con coincidencia semántica y filtros.'}
          </p>
        </div>

        <AdvancedSearch locale={locale} initialQuery={initialQuery} />
      </div>
    </main>
  );
}
