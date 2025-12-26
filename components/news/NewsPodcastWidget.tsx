'use client';

import { useEffect, useMemo, useState } from 'react';

type Locale = 'en' | 'es';

type PodcastApiResponse = {
  data: null | {
    id: string;
    periodStart: string;
    periodEnd: string;
    title: string;
    summary: string;
    script: string;
    highlights: string[];
    audioUrl: string | null;
    audioDurationSeconds: number | null;
    sources: unknown;
  };
};

function formatWindow(locale: Locale, startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const format = new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
  return `${format.format(start)} → ${format.format(end)}`;
}

export function NewsPodcastWidget({ locale }: { locale: Locale }) {
  const [episode, setEpisode] = useState<PodcastApiResponse['data']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/news/podcast?locale=${locale}`, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as PodcastApiResponse;
        if (!cancelled) {
          setEpisode(json.data);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const labels = useMemo(
    () =>
      locale === 'es'
        ? {
            title: 'Podcast semanal (IA) · 7 días',
            loading: 'Generando episodio…',
            empty: 'Aún no hay episodio disponible.',
            error: 'No se pudo cargar el podcast.',
            noAudio: 'Audio no disponible (mostrando guion).',
            highlights: 'Puntos clave',
          }
        : {
            title: 'Weekly AI Podcast · 7 days',
            loading: 'Generating episode…',
            empty: 'No episode available yet.',
            error: 'Could not load the podcast.',
            noAudio: 'Audio unavailable (showing script).',
            highlights: 'Key highlights',
          },
    [locale],
  );

  return (
    <section className="border border-[#1F1F1F] bg-[#0A0A0A] rounded-2xl p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-white font-bold text-base tracking-tight">{labels.title}</h3>
          {episode ? (
            <p className="text-[#888888] font-mono text-xs mt-0.5">
              {formatWindow(locale, episode.periodStart, episode.periodEnd)}
            </p>
          ) : null}
        </div>
      </div>

      {loading ? <p className="text-[#888888] font-mono mt-2 text-xs">{labels.loading}</p> : null}
      {error ? (
        <p className="text-[#888888] font-mono mt-2 text-xs">
          {labels.error} ({error})
        </p>
      ) : null}

      {!loading && !error && !episode ? (
        <p className="text-[#888888] font-mono mt-2 text-xs">{labels.empty}</p>
      ) : null}

      {!loading && !error && episode ? (
        <div className="mt-2 space-y-3">
          <div>
            <div className="text-white font-semibold text-sm">{episode.title}</div>
            <div className="text-[#888888] font-mono text-xs mt-1">{episode.summary}</div>
          </div>

          {episode.audioUrl ? (
            <audio className="w-full" controls preload="none" src={episode.audioUrl} />
          ) : (
            <div className="border border-[#1F1F1F] rounded-xl p-3">
              <div className="text-[#888888] font-mono text-xs mb-2">{labels.noAudio}</div>
              <div className="text-white/90 text-xs leading-relaxed whitespace-pre-line">{episode.script}</div>
            </div>
          )}

          {episode.highlights?.length ? (
            <div className="border-t border-[#1F1F1F] pt-3">
              <div className="text-white font-semibold mb-2 text-sm">{labels.highlights}</div>
              <div className="space-y-1">
                {episode.highlights.slice(0, 6).map((item) => (
                  <div key={item} className="text-[#888888] font-mono text-xs">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
