import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AINews - AI News & Learning Platform',
    short_name: 'AINews',
    description: 'Your ultimate AI news and learning hub with AI-generated courses and knowledge graphs',
    start_url: '/en',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#3b82f6',
    orientation: 'portrait',
    icons: [
      {
        src: '/images/ainews-logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/images/ainews-logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['education', 'news', 'technology'],
    lang: 'en',
    dir: 'ltr',
  }
}
