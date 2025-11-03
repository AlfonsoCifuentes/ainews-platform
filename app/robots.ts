import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ainews.vercel.app';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/private/',
          '/*.json$',
          '/auth/callback',
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/en/', '/es/'],
        crawlDelay: 10,
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/en/', '/es/'],
        crawlDelay: 10,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
