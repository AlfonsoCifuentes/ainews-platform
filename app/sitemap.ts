import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/db/supabase-server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ainews.vercel.app';
  
  const supabase = await createClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/en`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/es`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/en/news`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/es/news`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/en/courses`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/es/courses`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/en/trending`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/es/trending`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/en/kg`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/es/kg`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/en/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/es/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
  ];

  // Dynamic pages - News articles
  const { data: articles } = await supabase
    .from('news_articles')
    .select('id, updated_at, published_at')
    .order('published_at', { ascending: false })
    .limit(1000); // Limit to last 1000 articles

  const articlePages: MetadataRoute.Sitemap = (articles || []).flatMap((article) => [
    {
      url: `${baseUrl}/en/news/${article.id}`,
      lastModified: new Date(article.updated_at || article.published_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/es/news/${article.id}`,
      lastModified: new Date(article.updated_at || article.published_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ]);

  // Dynamic pages - Courses
  const { data: courses } = await supabase
    .from('courses')
    .select('id, updated_at, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(500);

  const coursePages: MetadataRoute.Sitemap = (courses || []).flatMap((course) => [
    {
      url: `${baseUrl}/en/courses/${course.id}`,
      lastModified: new Date(course.updated_at || course.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/es/courses/${course.id}`,
      lastModified: new Date(course.updated_at || course.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
  ]);

  return [...staticPages, ...articlePages, ...coursePages];
}
