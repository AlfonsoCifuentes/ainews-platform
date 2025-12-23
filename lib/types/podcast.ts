import { z } from 'zod';

const isoDateStringSchema = z.coerce.date().transform((date) => date.toISOString());

export const podcastEpisodeSchema = z
  .object({
    id: z.string(),
    period_start: isoDateStringSchema,
    period_end: isoDateStringSchema,
    title_en: z.string().min(1),
    title_es: z.string().min(1),
    summary_en: z.string().min(1),
    summary_es: z.string().min(1),
    script_en: z.string().min(1),
    script_es: z.string().min(1),
    highlights_en: z.array(z.string()).optional().default([]),
    highlights_es: z.array(z.string()).optional().default([]),
    audio_url_en: z.string().nullable().optional().default(null),
    audio_url_es: z.string().nullable().optional().default(null),
    audio_duration_en: z.number().int().nullable().optional().default(null),
    audio_duration_es: z.number().int().nullable().optional().default(null),
    sources: z.unknown().optional(),
    created_at: isoDateStringSchema.optional(),
  })
  .transform((episode) => ({
    ...episode,
    highlights_en: episode.highlights_en ?? [],
    highlights_es: episode.highlights_es ?? [],
    audio_url_en: episode.audio_url_en ?? null,
    audio_url_es: episode.audio_url_es ?? null,
    audio_duration_en: episode.audio_duration_en ?? null,
    audio_duration_es: episode.audio_duration_es ?? null,
  }));

export type PodcastEpisode = z.infer<typeof podcastEpisodeSchema>;

export const podcastEpisodeArraySchema = z.array(podcastEpisodeSchema);