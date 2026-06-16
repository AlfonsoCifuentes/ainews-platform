import type { MetadataRoute } from 'next'
import { SITE_NAME, SITE_DESCRIPTION_EN } from '@/lib/config/site'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} · AI News`,
    short_name: 'Noticias IA',
    description: SITE_DESCRIPTION_EN,
    start_url: '/en',
    display: 'standalone',
    background_color: '#04050a',
    theme_color: '#6366f1',
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
