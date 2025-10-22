import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
import { Link } from '@/i18n';
import { GraphVisualizer } from '@/lib/lazy-components';

type Entity = { id: string; name: string; type: string; description?: string | null };
type Relation = { id: string; source_id: string; target_id: string; rel_type: string; weight?: number | null };
type EntityMap = Record<string, { id: string; name: string }>;

async function fetchEntity(id: string): Promise<Entity | null> {
  const res = await fetch(`/api/kg/entities/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data as Entity;
}

async function fetchRelations(id: string): Promise<{ outgoing: Relation[]; incoming: Relation[] }> {
  const [outRes, inRes] = await Promise.all([
    fetch(`/api/kg/relations?source_id=${id}`, { cache: 'no-store' }),
    fetch(`/api/kg/relations?target_id=${id}`, { cache: 'no-store' }),
  ]);
  const outgoing = outRes.ok ? ((await outRes.json()).data as Relation[]) : [];
  const incoming = inRes.ok ? ((await inRes.json()).data as Relation[]) : [];
  return { outgoing, incoming };
}

async function fetchEntityNames(ids: string[]): Promise<EntityMap> {
  if (ids.length === 0) return {};
  const res = await fetch(`/api/kg/entities?ids=${ids.join(',')}`, { cache: 'no-store' });
  if (!res.ok) return {};
  const json = await res.json();
  const entities = json.data as Array<{ id: string; name: string }>;
  const map: EntityMap = {};
  for (const e of entities) map[e.id] = { id: e.id, name: e.name };
  return map;
}

export default async function EntityPage({ params }: { params: { locale: string; id: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'kg' });
  const entity = await fetchEntity(params.id);
  if (!entity) {
    return (
      <main className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">{t('noResults')}</p>
        <div className="mt-6">
          <Link href="/kg">← {t('back')}</Link>
        </div>
      </main>
    );
  }

  const { outgoing, incoming } = await fetchRelations(entity.id);
  const relatedIds = Array.from(new Set([
    ...outgoing.map((r) => r.target_id),
    ...incoming.map((r) => r.source_id),
  ]));
  const names = await fetchEntityNames(relatedIds);

  // Prepare graph data
  const graphNodes = [
    { id: entity.id, name: entity.name, type: entity.type },
    ...relatedIds.map((rid) => ({
      id: rid,
      name: names[rid]?.name ?? rid,
      type: 'unknown',
    })),
  ];
  const graphEdges = [
    ...outgoing.map((r) => ({ source: entity.id, target: r.target_id, type: r.rel_type })),
    ...incoming.map((r) => ({ source: r.source_id, target: entity.id, type: r.rel_type })),
  ];

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-4 text-sm text-muted-foreground">{entity.type}</div>
      <h1 className="text-3xl font-bold">{entity.name}</h1>
      {entity.description ? <p className="mt-2 max-w-3xl">{entity.description}</p> : null}

      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">{t('graphVisualization')}</h2>
        <GraphVisualizer
          nodes={graphNodes}
          edges={graphEdges}
          width={800}
          height={500}
          onNodeClick={(node) => {
            if (typeof window !== 'undefined' && node.id !== entity.id) {
              window.location.href = `/kg/${node.id}`;
            }
          }}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-3">{t('relations.outgoing')}</h2>
        {outgoing.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('relations.none')}</p>
        ) : (
          <ul className="space-y-2">
            {outgoing.map((r) => (
              <li key={r.id} className="rounded border p-3">
                <div className="text-sm text-muted-foreground">{r.rel_type}</div>
                <div>
                  → <Link href={`/kg/${r.target_id}`}>{names[r.target_id]?.name ?? r.target_id}</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-3">{t('relations.incoming')}</h2>
        {incoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('relations.none')}</p>
        ) : (
          <ul className="space-y-2">
            {incoming.map((r) => (
              <li key={r.id} className="rounded border p-3">
                <div className="text-sm text-muted-foreground">{r.rel_type}</div>
                <div>
                  ← <Link href={`/kg/${r.source_id}`}>{names[r.source_id]?.name ?? r.source_id}</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10">
        <Link href="/kg">← {t('back')}</Link>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: { params: { locale: string; id: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'kg' });
  // Try to fetch to set a nice title; fall back if not available
  let title = t('title');
  try {
    const res = await fetch(`/api/kg/entities/${params.id}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.name) title = `${json.data.name} — ${t('title')}`;
    }
  } catch {}
  return {
    title,
    alternates: {
      languages: {
        en: `/en/kg/${params.id}`,
        es: `/es/kg/${params.id}`,
      },
    },
  };
}
