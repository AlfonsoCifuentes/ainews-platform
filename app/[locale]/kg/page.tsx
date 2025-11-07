import { Suspense } from 'react';
import { Link } from '@/i18n';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { EntityListSkeleton } from '@/components/kg/EntityCardSkeleton';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { KGPageClient } from '@/components/kg/KGPageClient';
import { EntityGrid } from '@/components/kg/EntityGrid';
import { GraphVisualizer } from '@/components/kg/GraphVisualizer';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'kg' });
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
  
  try {
    // Use absolute URL for server-side fetch in SSR
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/kg/entities${search}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data as Array<{ id: string; name: string; type: string; description?: string | null }>;
  } catch (error) {
    console.error('Failed to fetch entities:', error);
    return [];
  }
}

async function fetchGraphData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/kg/graph?limit=100&minWeight=0.3`, { cache: 'no-store' });
    if (!res.ok) return { entities: [], relations: [] };
    const json = await res.json();
    return json.data as { 
      entities: Array<{ id: string; name: string; type: string }>;
      relations: Array<{ sourceId: string; targetId: string; type: string; weight: number }>;
    };
  } catch (error) {
    console.error('Failed to fetch graph data:', error);
    return { entities: [], relations: [] };
  }
}

export default async function KGPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; type?: string; page?: string; view?: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'kg' });
  const sp = await searchParams;
  const q = sp?.q ?? '';
  const type = sp?.type ?? '';
  const page = Math.max(1, parseInt(sp?.page ?? '1', 10) || 1);
  const view = sp?.view ?? 'list'; // 'list' or 'graph'
  
  const entities = await fetchEntities(q, type || undefined, page);
  const graphData = view === 'graph' ? await fetchGraphData() : { entities: [], relations: [] };
  
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
      {/* View Tabs */}
      <div className="mb-8 flex gap-4 border-b border-white/10">
        <Link
          href={{ pathname: '/kg', query: { ...sp, view: 'list' } }}
          className={`pb-4 px-6 transition-all ${
            view === 'list' 
              ? 'border-b-2 border-primary text-primary font-semibold' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          📋 {t('views.list', { default: 'Entity List' })}
        </Link>
        <Link
          href={{ pathname: '/kg', query: { ...sp, view: 'graph' } }}
          className={`pb-4 px-6 transition-all ${
            view === 'graph' 
              ? 'border-b-2 border-primary text-primary font-semibold' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          🕸️ {t('views.graph', { default: 'Graph View' })}
        </Link>
      </div>

      <ErrorBoundary>
        {view === 'list' ? (
          <>
            <Suspense fallback={<EntityListSkeleton />}>
              <EntityGrid entities={entities} noResults={t('noResults')} />
            </Suspense>

            {/* Pagination */}
            <div className="mt-8 flex items-center justify-between">
              <Link
                href={{ pathname: '/kg', query: { q, type, page: Math.max(1, page - 1), view } }}
                className="glass rounded-xl border border-white/10 px-6 py-3 transition-all hover:border-primary/30 hover:shadow-lg disabled:opacity-50"
                aria-disabled={page <= 1}
              >
                ← {t('filters.prev')}
              </Link>
              <span className="text-sm text-muted-foreground">{t('filters.page', { page })}</span>
              <Link
                href={{ pathname: '/kg', query: { q, type, page: page + 1, view } }}
                className="glass rounded-xl border border-white/10 px-6 py-3 transition-all hover:border-primary/30 hover:shadow-lg"
              >
                {t('filters.next')} →
              </Link>
            </div>
          </>
        ) : (
          <div className="h-[800px] rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl">
            <GraphVisualizer 
              entities={graphData.entities} 
              relations={graphData.relations} 
            />
          </div>
        )}
      </ErrorBoundary>
    </KGPageClient>
  );
}
