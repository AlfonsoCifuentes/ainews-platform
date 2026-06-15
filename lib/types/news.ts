import { z } from 'zod';

const isoDateStringSchema = z
  .union([z.string(), z.date()])
  .transform((value) => (value instanceof Date ? value : new Date(value)).toISOString());

export const newsArticleSchema = z
  .object({
    id: z.string(),
    title_en: z.string().min(1),
    title_es: z.string().min(1),
    summary_en: z.string().min(1),
    summary_es: z.string().min(1),
    content_en: z.string().min(1),
    content_es: z.string().min(1),
    category: z.string().min(1),
    // These fields can be null in the DB — .optional() only handles undefined, not null
    tags: z.array(z.string()).nullable().optional().default([]),
    source_url: z.string().nullable().optional().default(''), // .url() removed: empty/relative URLs from DB are valid
    image_url: z.string().nullable().optional().default(''), // .url() removed: same reason
    published_at: isoDateStringSchema,
    ai_generated: z.boolean().nullable().optional().default(false),
    quality_score: z.number().min(0).max(1).nullable().optional().default(0.8),
    reading_time_minutes: z.number().int().min(1).max(60).nullable().optional().default(5),
    // Multi-source corroboration (Phase 2). Optional so rows predating the
    // migration / clustering job still validate.
    story_cluster_id: z.string().nullable().optional().default(null),
    corroboration_count: z.coerce.number().int().min(1).nullable().optional().default(1),
    importance_score: z.coerce.number().nullable().optional().default(0),
    corroborating_sources: z
      .array(
        z
          .object({
            domain: z.string(),
            url: z.string().nullable().optional(),
            tier: z.string().nullable().optional(),
          })
          .passthrough(),
      )
      .nullable()
      .optional()
      .default([]),
    is_cluster_primary: z.boolean().nullable().optional().default(true),
  })
  .transform((article) => ({
    ...article,
    tags: article.tags ?? [],
    source_url: article.source_url ?? '',
    image_url: article.image_url ?? '',
    ai_generated: article.ai_generated ?? false,
    quality_score: article.quality_score ?? 0.8,
    reading_time_minutes: article.reading_time_minutes ?? 5,
    story_cluster_id: article.story_cluster_id ?? null,
    corroboration_count: article.corroboration_count ?? 1,
    importance_score: article.importance_score ?? 0,
    corroborating_sources: article.corroborating_sources ?? [],
    is_cluster_primary: article.is_cluster_primary ?? true,
  }));

export type INewsArticle = z.infer<typeof newsArticleSchema>;

/** Loose input shape (before defaults/transform) — useful for seed/sample data. */
export type NewsArticleInput = z.input<typeof newsArticleSchema>;

// Partial article type for recommendations (only required fields)
export type IArticlePreview = Pick<
  INewsArticle,
  'id' | 'title_en' | 'title_es' | 'summary_en' | 'summary_es' | 'category' | 'published_at'
> & {
  image_url?: string | null;
  tags?: string[];
  source_url?: string;
  ai_generated?: boolean;
  quality_score?: number;
  reading_time_minutes?: number;
  content_en?: string;
  content_es?: string;
};

export const newsArticleArraySchema = z.array(newsArticleSchema);
