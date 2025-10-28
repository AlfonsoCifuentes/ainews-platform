import { setRequestLocale } from 'next-intl/server';
import { AdvancedSearch } from '@/components/search/AdvancedSearch';
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
      ? `${locale === 'en' ? 'Search' : 'Buscar'}: ${query} | AINews`
      : `${locale === 'en' ? 'Search' : 'Buscar'} | AINews`,
    description:
      locale === 'en'
        ? 'Search AI news, courses, and research with advanced filters and semantic search.'
        : 'Busca noticias de IA, cursos e investigación con filtros avanzados y búsqueda semántica.',
  };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const initialQuery = sp.q || '';

  return (
    <main className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {locale === 'en' ? 'Search' : 'Buscar'}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {locale === 'en'
              ? 'Discover AI news, courses, and research with powerful search and filters'
              : 'Descubre noticias de IA, cursos e investigación con búsqueda y filtros potentes'}
          </p>
        </div>

        <AdvancedSearch locale={locale} initialQuery={initialQuery} />
      </div>
    </main>
  );
}
