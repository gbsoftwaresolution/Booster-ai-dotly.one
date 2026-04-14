import type { MetadataRoute } from 'next'
import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from '@/lib/seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: 'Dotly',
    description: SITE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui', 'browser'],
    background_color: '#f6faff',
    theme_color: '#0ea5e9',
    categories: ['business', 'productivity', 'networking'],
    lang: 'en',
    orientation: 'portrait',
    id: getSiteUrl(),
    prefer_related_applications: false,
    icons: [
      {
        src: '/icons/196.png',
        sizes: '196x196',
        type: 'image/png',
      },
      {
        src: '/icons/512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}