import { Suspense } from 'react';
import { Link } from '@/i18n';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { EntityListSkeleton } from '@/components/kg/EntityCardSkeleton';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { KGPageClient } from '@/components/kg/KGPageClient';
import { EntityGrid } from '@/components/kg/EntityGrid';

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
    <KGPageClient
      title={t('title')}
      searchPlaceholder={t('searchPlaceholder')}
      filters={{
        allTypes: t('filters.allTypes'),
        person: t('filters.person'),
        organization: t('filters.organization'),
        model: t('filters.model'),
        company: t('filters.company'),
        paper: t('filters.paper'),
        concept: t('filters.concept'),
        apply: t('filters.apply'),
      }}
    >
      <ErrorBoundary>
        <Suspense fallback={<EntityListSkeleton />}>
          <EntityGrid entities={entities} noResults={t('noResults')} />
        </Suspense>
      </ErrorBoundary>

      {/* Pagination */}
      <div className="mt-8 flex items-center justify-between">
        <Link
          href={{ pathname: '/kg', query: { q, type, page: Math.max(1, page - 1) } }}
          className="glass rounded-xl border border-white/10 px-6 py-3 transition-all hover:border-primary/30 hover:shadow-lg disabled:opacity-50"
          aria-disabled={page <= 1}
        >
          ← {t('filters.prev')}
        </Link>
        <span className="text-sm text-muted-foreground">{t('filters.page', { page })}</span>
        <Link
          href={{ pathname: '/kg', query: { q, type, page: page + 1 } }}
          className="glass rounded-xl border border-white/10 px-6 py-3 transition-all hover:border-primary/30 hover:shadow-lg"
        >
          {t('filters.next')} →
        </Link>
      </div>
    </KGPageClient>
  );
}
