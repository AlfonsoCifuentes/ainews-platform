import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { defaultLocale, locales } from '@/i18n';
import { fetchLatestPodcastEpisode } from '@/lib/db/podcast';
import { ensureWeeklyPodcastEpisode, generateWeeklyPodcastEpisodePreview } from '@/lib/services/news-podcast';

const QuerySchema = z.object({
  locale: z.enum(locales).default(defaultLocale),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parsed = QuerySchema.parse({
      locale: searchParams.get('locale') ?? undefined,
    });

    const shouldAttemptRefresh = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

    let episode = shouldAttemptRefresh
      ? await ensureWeeklyPodcastEpisode()
      : await fetchLatestPodcastEpisode();

    if (!episode) {
      episode = await generateWeeklyPodcastEpisodePreview();
    }

    if (!episode) {
      return NextResponse.json({ data: null }, { status: 200 });
    }

    const locale = parsed.locale;

    return NextResponse.json(
      {
        data: {
          id: episode.id,
          periodStart: episode.period_start,
          periodEnd: episode.period_end,
          title: locale === 'es' ? episode.title_es : episode.title_en,
          summary: locale === 'es' ? episode.summary_es : episode.summary_en,
          script: locale === 'es' ? episode.script_es : episode.script_en,
          highlights: locale === 'es' ? episode.highlights_es : episode.highlights_en,
          audioUrl: locale === 'es' ? episode.audio_url_es : episode.audio_url_en,
          audioDurationSeconds: locale === 'es' ? episode.audio_duration_es : episode.audio_duration_en,
          sources: episode.sources ?? null,
        },
      },
      {
        headers: {
          // Cache responses, but allow weekly regeneration behind the scenes.
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.flatten() }, { status: 400 });
    }

    console.error('[API /api/news/podcast] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
