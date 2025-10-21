import { z } from 'zod';

const isoDateStringSchema = z.coerce.date().transform((date) => date.toISOString());

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
    tags: z.array(z.string()).optional().default([]),
    source_url: z.string().url().optional().default(''),
    image_url: z.string().url().optional().default(''),
    published_at: isoDateStringSchema,
    ai_generated: z.boolean().optional().default(false),
    quality_score: z.number().min(0).max(1).optional().default(0.8),
    reading_time_minutes: z.number().int().min(1).max(60).optional().default(5),
  })
  .transform((article) => ({
    ...article,
    tags: article.tags ?? [],
    source_url: article.source_url ?? '',
    image_url: article.image_url ?? '',
    ai_generated: article.ai_generated ?? false,
    quality_score: article.quality_score ?? 0.8,
    reading_time_minutes: article.reading_time_minutes ?? 5,
  }));

export type INewsArticle = z.infer<typeof newsArticleSchema>;

export const newsArticleArraySchema = z.array(newsArticleSchema);
