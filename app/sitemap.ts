import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/db/supabase-server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ainews.vercel.app';
  
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
    createEntry('', { changeFrequency: 'daily', priority: 1 }),
    createEntry('/news', { changeFrequency: 'hourly', priority: 0.9 }),
    createEntry('/courses', { changeFrequency: 'daily', priority: 0.8 }),
    createEntry('/trending', { changeFrequency: 'hourly', priority: 0.8 }),
    createEntry('/kg', { changeFrequency: 'daily', priority: 0.7 }),
    createEntry('/leaderboard', { changeFrequency: 'daily', priority: 0.6 }),
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

  // Dynamic pages - Courses
  const { data: courses } = await supabase
    .from('courses')
    .select('id, updated_at, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(500);

  const coursePages: MetadataRoute.Sitemap = (courses || []).map((course) =>
    createEntry(`/courses/${course.id}`, {
      lastModified: new Date(course.updated_at || course.created_at),
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  );

  return [...staticPages, ...articlePages, ...coursePages];
}
