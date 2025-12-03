import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ThotNet Core · AI News & Learning Nexus',
    short_name: 'ThotNet',
    description: 'ThotNet Core is your bilingual AI news and learning hub with book-style courses and autonomous agents.',
    start_url: '/en',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#3b82f6',
    orientation: 'portrait',
    icons: [
      {
        src: '/logos/thotnet-core-white-only.png',
        sizes: '2048x2048',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logos/thotnet-core-white-only.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['education', 'news', 'technology'],
    lang: 'en',
    dir: 'ltr',
  }
}
