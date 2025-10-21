import { Suspense } from 'react';
import { Link } from '@/i18n';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { EntityListSkeleton } from '@/components/kg/EntityCardSkeleton';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'kg' });
  return {
    title: t('title'),
    alternates: {
      languages: {
        en: `/en/kg`,
        es: `/es/kg`,
      },
    },
  };
}

async function fetchEntities(query?: string, type?: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (type) params.set('type', type);
  const offset = (page - 1) * pageSize;
  params.set('limit', String(pageSize));
  params.set('offset', String(offset));
  const search = `?${params.toString()}`;
  const res = await fetch(`/api/kg/entities${search}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data as Array<{ id: string; name: string; type: string; description?: string | null }>;
}

export default async function KGPage({ params, searchParams }: { params: { locale: string }; searchParams?: { q?: string; type?: string; page?: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'kg' });
  const q = searchParams?.q ?? '';
  const type = searchParams?.type ?? '';
  const page = Math.max(1, parseInt(searchParams?.page ?? '1', 10) || 1);
  const entities = await fetchEntities(q, type || undefined, page);
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>
      <form className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder={t('searchPlaceholder')}
          className="w-full max-w-xl rounded-md border px-3 py-2"
        />
        <select name="type" defaultValue={type} className="w-full sm:w-56 rounded-md border px-3 py-2">
          <option value="">{t('filters.allTypes')}</option>
          <option value="person">{t('filters.person')}</option>
          <option value="organization">{t('filters.organization')}</option>
          <option value="model">{t('filters.model')}</option>
          <option value="company">{t('filters.company')}</option>
          <option value="paper">{t('filters.paper')}</option>
          <option value="concept">{t('filters.concept')}</option>
        </select>
        <button className="rounded-md bg-primary text-primary-foreground px-4 py-2" type="submit">
          {t('filters.apply')}
        </button>
      </form>
      <ErrorBoundary>
        <Suspense fallback={<EntityListSkeleton />}>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entities.map((e) => (
            <li
              key={e.id}
              className="group rounded-2xl border p-5 backdrop-blur-xl bg-card/60 hover:bg-card transition-all duration-300 hover:shadow-xl"
            >
              <div className="text-xs uppercase tracking-wide text-muted-foreground/80">{e.type}</div>
              <div className="text-xl font-semibold mt-1">
                <Link href={`/kg/${e.id}`} className="hover:underline">
                  {e.name}
                </Link>
              </div>
              {e.description ? (
                <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">{e.description}</p>
              ) : null}
            </li>
          ))}
          {entities.length === 0 ? (
            <li className="col-span-full text-sm text-muted-foreground">{t('noResults')}</li>
          ) : null}
        </ul>
      </Suspense>
      </ErrorBoundary>
      <div className="mt-8 flex items-center justify-between">
        <Link
          href={{ pathname: '/kg', query: { q, type, page: Math.max(1, page - 1) } }}
          className="px-3 py-2 rounded-md border hover:bg-accent disabled:opacity-50"
          aria-disabled={page <= 1}
        >
          ← {t('filters.prev')}
        </Link>
        <span className="text-sm text-muted-foreground">{t('filters.page', { page })}</span>
        <Link
          href={{ pathname: '/kg', query: { q, type, page: page + 1 } }}
          className="px-3 py-2 rounded-md border hover:bg-accent"
        >
          {t('filters.next')} →
        </Link>
      </div>
      <div className="mt-8 text-sm text-muted-foreground">
        <Link href="/">← {t('back')}</Link>
      </div>
    </main>
  );
}
