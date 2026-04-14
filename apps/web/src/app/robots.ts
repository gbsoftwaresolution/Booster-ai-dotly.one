import type { MetadataRoute } from 'next'
import { absoluteUrl, getSiteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/card/'],
        disallow: [
          '/api/',
          '/auth',
          '/dashboard/',
          '/analytics/',
          '/crm/',
          '/settings/',
          '/notifications/',
          '/billing/',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: getSiteUrl(),
  }
}