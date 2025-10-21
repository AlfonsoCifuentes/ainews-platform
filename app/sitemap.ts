import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com';
  const urls = [
    '/', '/en', '/es',
    '/en/news', '/es/news',
    '/en/courses', '/es/courses',
    '/en/kg', '/es/kg',
  ];
  return urls.map((path) => ({ url: `${base}${path}`, changefreq: 'daily', priority: 0.7 }));
}
