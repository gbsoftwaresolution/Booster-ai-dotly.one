import type { MetadataRoute } from 'next'
import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from '@/lib/seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    categories: ['business', 'productivity', 'networking'],
    lang: 'en',
    orientation: 'portrait',
    id: getSiteUrl(),
  }
}