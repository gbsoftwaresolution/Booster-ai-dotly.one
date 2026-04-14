import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    {
      url: absoluteUrl('/'),
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/pricing'),
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: absoluteUrl('/features'),
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/about'),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: absoluteUrl('/privacy'),
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/terms'),
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}