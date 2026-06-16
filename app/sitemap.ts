import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/db/supabase-server';
import { SITE_BASE_URL } from '@/lib/config/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_BASE_URL;

  const supabase = await createClient();

  // Helper to create entry with alternates
  const createEntry = (
    path: string,
    options?: {
      lastModified?: Date;
      changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'];
      priority?: number;
    }
  ): MetadataRoute.Sitemap[number] => ({
    url: `${baseUrl}/en${path}`,
    lastModified: options?.lastModified || new Date(),
    changeFrequency: options?.changeFrequency || 'daily',
    priority: options?.priority || 0.7,
    alternates: {
      languages: {
        en: `${baseUrl}/en${path}`,
        es: `${baseUrl}/es${path}`,
      },
    },
  });

  // Static pages with alternates
  const staticPages: MetadataRoute.Sitemap = [
    createEntry('', { changeFrequency: 'hourly', priority: 1 }),
    createEntry('/news', { changeFrequency: 'hourly', priority: 0.9 }),
    createEntry('/trending', { changeFrequency: 'hourly', priority: 0.8 }),
    createEntry('/search', { changeFrequency: 'weekly', priority: 0.5 }),
    createEntry('/about', { changeFrequency: 'monthly', priority: 0.5 }),
    createEntry('/contact', { changeFrequency: 'monthly', priority: 0.4 }),
    createEntry('/privacy', { changeFrequency: 'monthly', priority: 0.3 }),
    createEntry('/terms', { changeFrequency: 'monthly', priority: 0.3 }),
  ];

  // Dynamic pages - News articles
  const { data: articles } = await supabase
    .from('news_articles')
    .select('id, updated_at, published_at')
    .order('published_at', { ascending: false })
    .limit(1000); // Limit to last 1000 articles

  const articlePages: MetadataRoute.Sitemap = (articles || []).map((article) =>
    createEntry(`/news/${article.id}`, {
      lastModified: new Date(article.updated_at || article.published_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  );

  return [...staticPages, ...articlePages];
}
