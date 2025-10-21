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
