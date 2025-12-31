import Parser from 'rss-parser';
import pLimit from 'p-limit';
import { z } from 'zod';
import OpenAI from 'openai';

import { createLLMClientForTask, LLMClient } from '@/lib/ai/llm-client';
import { buildVerticalVoiceSystemPrompt } from '@/lib/ai/prompt-voice';
import { AI_PODCAST_SOURCES } from '@/lib/ai/podcast-sources';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { getActiveNewsletterFeeds } from '@/lib/services/newsletter-to-rss';
import type { PodcastEpisode } from '@/lib/types/podcast';

const parser = new Parser({
  customFields: {
    item: ['content:encoded', 'itunes:summary', 'itunes:subtitle'],
  },
});

const EpisodeSchema = z.object({
  title_en: z.string().min(8).max(120),
  title_es: z.string().min(8).max(120),
  summary_en: z.string().min(60).max(320),
  summary_es: z.string().min(60).max(320),
  script_en: z.string().min(800).max(4200),
  script_es: z.string().min(800).max(4200),
  highlights_en: z.array(z.string().min(12).max(180)).min(3).max(6),
  highlights_es: z.array(z.string().min(12).max(180)).min(3).max(6),
});

type EpisodeDraft = z.infer<typeof EpisodeSchema>;

type SourceItem = {
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string | null;
};

type SourceBundle = {
  news: SourceItem[];
  newsletters: SourceItem[];
  podcasts: SourceItem[];
};

export type PodcastEpisodePreview = {
  id: string;
  period_start: string;
  period_end: string;
  title_en: string;
  title_es: string;
  summary_en: string;
  summary_es: string;
  script_en: string;
  script_es: string;
  highlights_en: string[];
  highlights_es: string[];
  audio_url_en: string | null;
  audio_url_es: string | null;
  audio_duration_en: number | null;
  audio_duration_es: number | null;
  sources: SourceBundle;
};

const DEFAULT_LOOKBACK_DAYS = 7;
const MAX_NEWS_ITEMS = 12;
const MAX_NEWSLETTER_ITEMS = 10;
const MAX_PODCAST_ITEMS = 10;

const TTS_CHAR_LIMIT = 4800;

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, ' ');
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function compactText(input: string, maxChars: number): string {
  if (!input) return '';
  const cleaned = normalizeWhitespace(stripHtml(input));
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars).trim()}...`;
}

function safeParseDate(raw?: string | null): string | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function isWithinLookback(publishedAt: string | null, sinceMs: number): boolean {
  if (!publishedAt) return true;
  return new Date(publishedAt).getTime() >= sinceMs;
}

function sortByDateDesc(items: SourceItem[]): SourceItem[] {
  return [...items].sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'source';
  }
}

function clampText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trim();
}

function normalizeDraft(draft: EpisodeDraft): EpisodeDraft {
  return {
    ...draft,
    script_en: clampText(draft.script_en, TTS_CHAR_LIMIT),
    script_es: clampText(draft.script_es, TTS_CHAR_LIMIT),
  };
}

function buildEpisodePrompt(windowStart: string, windowEnd: string, sources: SourceBundle): string {
  const payload = {
    window: { start: windowStart, end: windowEnd },
    news: sources.news,
    newsletters: sources.newsletters,
    podcasts: sources.podcasts,
  };

  return `You are producing a weekly AI news podcast based on structured inputs.

GOAL:
- Summarize the most important AI news from the last 7 days.
- Contrast signals across RSS news, AI newsletters, and AI podcast episodes.
- Call out where multiple source types corroborate the same topic.
- If a topic appears in only one source type, label it as emerging or needing confirmation.

STYLE:
- Professional, tight, and audio-friendly.
- Short paragraphs, clear transitions, no fluff.
- No URLs, no emojis, no markdown.

OUTPUT RULES:
- Return ONLY valid JSON that matches the required schema.
- Keep both scripts within 800-4200 characters.
- Spanish must be neutral and clear. English must be polished and precise.
- Use the same story order in both languages.

REQUIRED JSON SCHEMA:
{
  "title_en": "string",
  "title_es": "string",
  "summary_en": "string",
  "summary_es": "string",
  "script_en": "string",
  "script_es": "string",
  "highlights_en": ["string", "string", "string"],
  "highlights_es": ["string", "string", "string"]
}

INPUT DATA (JSON):
${JSON.stringify(payload)}
`;
}

function buildHeuristicEpisodeDraft(windowStart: string, windowEnd: string, sources: SourceBundle): EpisodeDraft {
  const topNews = sources.news.slice(0, 6);
  const headlineListEn = topNews.map((item) => `- ${item.title}`).join('\n');
  const headlineListEs = topNews.map((item) => `- ${item.title}`).join('\n');

  const highlightsEn = topNews.slice(0, 5).map((item) => item.title).filter(Boolean);
  const highlightsEs = topNews.slice(0, 5).map((item) => item.title).filter(Boolean);

  const titleEn = 'AI Weekly Briefing';
  const titleEs = 'Briefing semanal de IA';

  const summaryEn = `A quick weekly briefing covering the most relevant AI developments between ${windowStart} and ${windowEnd}.`;
  const summaryEs = `Un briefing semanal rápido con los temas de IA más relevantes entre ${windowStart} y ${windowEnd}.`;

  const scriptEn = normalizeWhitespace(
    `Welcome to your weekly AI briefing. Here are the top stories we tracked this week:\n${headlineListEn}\n\nThat's the update. See you next week.`,
  );
  const scriptEs = normalizeWhitespace(
    `Bienvenido a tu briefing semanal de IA. Estos son los temas principales de la semana:\n${headlineListEs}\n\nEso es todo por hoy. Hasta la próxima semana.`,
  );

  return normalizeDraft({
    title_en: titleEn,
    title_es: titleEs,
    summary_en: summaryEn,
    summary_es: summaryEs,
    script_en: scriptEn,
    script_es: scriptEs,
    highlights_en: highlightsEn.length >= 3 ? highlightsEn.slice(0, 6) : ['Top AI story', 'What changed', 'Why it matters'],
    highlights_es: highlightsEs.length >= 3 ? highlightsEs.slice(0, 6) : ['Tema de IA', 'Qué cambió', 'Por qué importa'],
  });
}

export async function generateWeeklyPodcastEpisodePreview(
  options: { lookbackDays?: number } = {},
): Promise<PodcastEpisodePreview | null> {
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const now = new Date();
  const { start, end } = computeWindow(now, lookbackDays);
  const windowStart = start.toISOString();
  const windowEnd = end.toISOString();
  const sinceMs = start.getTime();

  const [news, newsletters, podcasts] = await Promise.all([
    fetchNewsHighlights(windowStart),
    fetchRssHighlights(getActiveNewsletterFeeds(), sinceMs, MAX_NEWSLETTER_ITEMS, 'newsletter'),
    fetchRssHighlights(
      AI_PODCAST_SOURCES.map((source) => ({ name: source.name, url: source.url })),
      sinceMs,
      MAX_PODCAST_ITEMS,
      'podcast',
    ),
  ]);

  const sources: SourceBundle = {
    news,
    newsletters,
    podcasts,
  };

  let draft: EpisodeDraft | null = null;

  try {
    let llm: LLMClient;
    if (process.env.OPENAI_API_KEY) {
      llm = new LLMClient(process.env.OPENAI_API_KEY, 'https://api.openai.com/v1', 'gpt-4o-mini', 'openai');
      console.log('[Podcast] ✓ Using OpenAI (gpt-4o-mini) for weekly podcast preview');
    } else {
      llm = await createLLMClientForTask('news_rewrite');
    }

    draft = await generateEpisodeDraft(llm, windowStart, windowEnd, sources);
  } catch (error) {
    console.warn('[Podcast] Preview generation via LLM failed, using heuristic fallback:', error);
    draft = null;
  }

  if (!draft) {
    try {
      draft = buildHeuristicEpisodeDraft(windowStart, windowEnd, sources);
    } catch (error) {
      console.error('[Podcast] Heuristic preview generation failed:', error);
      return null;
    }
  }

  return {
    id: 'preview',
    period_start: windowStart,
    period_end: windowEnd,
    title_en: draft.title_en,
    title_es: draft.title_es,
    summary_en: draft.summary_en,
    summary_es: draft.summary_es,
    script_en: draft.script_en,
    script_es: draft.script_es,
    highlights_en: draft.highlights_en,
    highlights_es: draft.highlights_es,
    audio_url_en: null,
    audio_url_es: null,
    audio_duration_en: null,
    audio_duration_es: null,
    sources,
  };
}

async function fetchNewsHighlights(sinceIso: string): Promise<SourceItem[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('news_articles')
    .select('title_en, title_es, summary_en, summary_es, source_url, published_at, quality_score')
    .gte('published_at', sinceIso)
    .order('quality_score', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(MAX_NEWS_ITEMS);

  if (error) {
    console.warn('[Podcast] Failed to fetch news highlights:', error.message);
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    const { data: fallback } = await supabase
      .from('news_articles')
      .select('title_en, title_es, summary_en, summary_es, source_url, published_at, quality_score')
      .order('published_at', { ascending: false })
      .limit(MAX_NEWS_ITEMS);

    if (fallback) {
      rows.push(...fallback);
    }
  }

  return rows.map((row) => {
    const title = row.title_en || row.title_es || 'Untitled';
    const summary = row.summary_en || row.summary_es || '';
    return {
      title: compactText(title, 160),
      summary: compactText(summary, 260),
      url: row.source_url || '',
      source: row.source_url ? extractDomain(row.source_url) : 'news',
      publishedAt: safeParseDate(row.published_at),
    } satisfies SourceItem;
  });
}

async function fetchRssHighlights(
  sources: Array<{ name: string; url: string }>,
  sinceMs: number,
  maxItems: number,
  label: string,
): Promise<SourceItem[]> {
  if (sources.length === 0) return [];

  const limit = pLimit(4);
  const results = await Promise.all(
    sources.map((source) =>
      limit(async () => {
        try {
          const feed = await parser.parseURL(source.url);
          const items = feed.items ?? [];
          return items.map((item) => {
            const rawSummary =
              (item as { ['itunes:summary']?: string })['itunes:summary'] ||
              (item as { ['itunes:subtitle']?: string })['itunes:subtitle'] ||
              (item as { ['content:encoded']?: string })['content:encoded'] ||
              (item as { content?: string })?.content ||
              item.contentSnippet ||
              '';

            const publishedAt = safeParseDate(item.isoDate || item.pubDate || null);

            return {
              title: compactText(item.title || 'Untitled', 160),
              summary: compactText(rawSummary, 260),
              url: item.link || '',
              source: source.name,
              publishedAt,
            } satisfies SourceItem;
          });
        } catch (error) {
          console.warn(`[Podcast] ${label} feed failed: ${source.name}`, error);
          return [] as SourceItem[];
        }
      }),
    ),
  );

  const flattened = results.flat();
  const filtered = flattened.filter((item) => isWithinLookback(item.publishedAt, sinceMs));
  return sortByDateDesc(filtered).slice(0, maxItems);
}

async function generateEpisodeDraft(
  llm: LLMClient,
  windowStart: string,
  windowEnd: string,
  sources: SourceBundle,
): Promise<EpisodeDraft> {
  const prompt = buildEpisodePrompt(windowStart, windowEnd, sources);
  const systemPrompt = buildVerticalVoiceSystemPrompt({ locale: 'en', vertical: 'news' });
  const draft = await llm.classify(prompt, EpisodeSchema, systemPrompt);
  return normalizeDraft(draft);
}

async function generatePodcastAudio(
  episodeId: string,
  locale: 'en' | 'es',
  script: string,
): Promise<{ audioUrl: string | null; durationSeconds: number | null }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[Podcast] OPENAI_API_KEY missing, skipping TTS');
    return { audioUrl: null, durationSeconds: null };
  }

  const openai = new OpenAI({ apiKey });
  const input = script.slice(0, TTS_CHAR_LIMIT);

  const modelCandidates = Array.from(
    new Set(
      [
        process.env.OPENAI_TTS_MODEL,
        'gpt-4o-mini-tts',
        'tts-1',
        'tts-1-hd',
      ].filter((m): m is string => typeof m === 'string' && m.trim().length > 0),
    ),
  );

  const voice = locale === 'es' ? 'nova' : 'alloy';
  let speech: Awaited<ReturnType<typeof openai.audio.speech.create>> | null = null;

  for (const model of modelCandidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        speech = await openai.audio.speech.create(
          {
            model,
            voice,
            input,
          },
          { signal: controller.signal },
        );
      } finally {
        clearTimeout(timeout);
      }
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[Podcast] TTS model failed', { model, message });
    }
  }

  if (!speech) {
    return { audioUrl: null, durationSeconds: null };
  }

  const audioBuffer = Buffer.from(await speech.arrayBuffer());
  const supabase = getSupabaseServerClient();
  const fileName = `podcasts/${episodeId}-${locale}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(fileName, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (uploadError) {
    console.warn('[Podcast] Failed to upload audio, using data URL fallback', uploadError.message);
    const base64 = audioBuffer.toString('base64');
    return {
      audioUrl: `data:audio/mpeg;base64,${base64}`,
      durationSeconds: Math.round((speech as { duration?: number }).duration ?? 0),
    };
  }

  const { data: publicUrl } = supabase.storage.from('audio').getPublicUrl(fileName);
  return {
    audioUrl: publicUrl?.publicUrl ?? null,
    durationSeconds: Math.round((speech as { duration?: number }).duration ?? 0),
  };
}

function computeWindow(now: Date, lookbackDays: number): { start: Date; end: Date } {
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - lookbackDays);
  return { start, end };
}

export function isEpisodeStale(episode: PodcastEpisode, now = new Date()): boolean {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - DEFAULT_LOOKBACK_DAYS);
  return new Date(episode.period_end).getTime() < cutoff.getTime();
}

export async function getLatestPodcastEpisode(): Promise<PodcastEpisode | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('news_podcast_episodes')
    .select('*')
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as PodcastEpisode;
}

export async function ensureWeeklyPodcastEpisode(
  options: { force?: boolean; lookbackDays?: number } = {},
): Promise<PodcastEpisode | null> {
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const now = new Date();

  const latest = await getLatestPodcastEpisode();
  if (latest && !options.force && !isEpisodeStale(latest, now)) {
    return latest;
  }

  const { start, end } = computeWindow(now, lookbackDays);
  const windowStart = start.toISOString();
  const windowEnd = end.toISOString();
  const sinceMs = start.getTime();

  const [news, newsletters, podcasts] = await Promise.all([
    fetchNewsHighlights(windowStart),
    fetchRssHighlights(getActiveNewsletterFeeds(), sinceMs, MAX_NEWSLETTER_ITEMS, 'newsletter'),
    fetchRssHighlights(
      AI_PODCAST_SOURCES.map((source) => ({ name: source.name, url: source.url })),
      sinceMs,
      MAX_PODCAST_ITEMS,
      'podcast',
    ),
  ]);

  const sources: SourceBundle = {
    news,
    newsletters,
    podcasts,
  };

  let llm: LLMClient;
  try {
    if (process.env.OPENAI_API_KEY) {
      llm = new LLMClient(process.env.OPENAI_API_KEY, 'https://api.openai.com/v1', 'gpt-4o-mini', 'openai');
      console.log('[Podcast] ✓ Using OpenAI (gpt-4o-mini) for weekly podcast generation');
    } else {
      llm = await createLLMClientForTask('news_rewrite');
    }
  } catch (error) {
    console.error('[Podcast] Failed to initialize LLM client:', error);
    return null;
  }

  let draft: EpisodeDraft;
  try {
    draft = await generateEpisodeDraft(llm, windowStart, windowEnd, sources);
  } catch (error) {
    console.error('[Podcast] LLM generation failed:', error);
    return null;
  }

  const supabase = getSupabaseServerClient();
  const insertPayload = {
    period_start: windowStart,
    period_end: windowEnd,
    title_en: draft.title_en,
    title_es: draft.title_es,
    summary_en: draft.summary_en,
    summary_es: draft.summary_es,
    script_en: draft.script_en,
    script_es: draft.script_es,
    highlights_en: draft.highlights_en,
    highlights_es: draft.highlights_es,
    sources,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('news_podcast_episodes')
    .upsert(insertPayload, { onConflict: 'period_start,period_end' })
    .select('*')
    .single();

  if (insertError || !inserted) {
    console.error('[Podcast] Failed to insert episode:', insertError?.message || 'Unknown error');
    return null;
  }

  const episodeId = inserted.id as string;
  const [audioEn, audioEs] = await Promise.all([
    generatePodcastAudio(episodeId, 'en', draft.script_en),
    generatePodcastAudio(episodeId, 'es', draft.script_es),
  ]);

  const updatePayload: Record<string, unknown> = {};
  if (audioEn.audioUrl) updatePayload.audio_url_en = audioEn.audioUrl;
  if (audioEs.audioUrl) updatePayload.audio_url_es = audioEs.audioUrl;
  if (audioEn.durationSeconds !== null) updatePayload.audio_duration_en = audioEn.durationSeconds;
  if (audioEs.durationSeconds !== null) updatePayload.audio_duration_es = audioEs.durationSeconds;

  if (Object.keys(updatePayload).length > 0) {
    const { data: updated, error: updateError } = await supabase
      .from('news_podcast_episodes')
      .update(updatePayload)
      .eq('id', episodeId)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.warn('[Podcast] Failed to update audio fields:', updateError?.message || 'Unknown error');
      return inserted as PodcastEpisode;
    }

    return updated as PodcastEpisode;
  }

  return inserted as PodcastEpisode;
}