import type { Metadata } from 'next'
import { getAppUrl } from '@/lib/app-url'

export const SITE_NAME = 'Dotly.one'
export const SITE_TAGLINE = 'Tap. Share. Convert.'
export const SITE_DESCRIPTION =
  'Dotly.one helps professionals share digital business cards, capture leads, track engagement analytics, and manage follow-up from one platform.'
export const SITE_KEYWORDS = [
  'digital business card',
  'digital business cards',
  'NFC business card',
  'QR business card',
  'business card with analytics',
  'digital networking platform',
  'lead capture',
  'contactless networking',
  'business card CRM',
  'professional profile',
  'sales networking tool',
]

export function getSiteUrl(): string {
  return getAppUrl()
}

export function getMetadataBase(): URL {
  return new URL(getSiteUrl())
}

export function absoluteUrl(path = '/'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return new URL(normalizedPath, `${getSiteUrl()}/`).toString()
}

export function buildMarketingOgImage(options: {
  title: string
  description: string
  path?: string
}): string {
  const params = new URLSearchParams({
    title: options.title,
    description: options.description,
    path: options.path ?? '/',
  })

  return absoluteUrl(`/api/og?${params.toString()}`)
}

export function createMarketingMetadata(options: {
  title: string
  description: string
  path: string
  keywords?: string[]
}): Metadata {
  const imageUrl = buildMarketingOgImage({
    title: options.title,
    description: options.description,
    path: options.path,
  })

  return {
    title: options.title,
    description: options.description,
    keywords: [...SITE_KEYWORDS, ...(options.keywords ?? [])],
    alternates: {
      canonical: options.path,
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: absoluteUrl(options.path),
      siteName: SITE_NAME,
      title: `${options.title} | ${SITE_NAME}`,
      description: options.description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${options.title} | ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${options.title} | ${SITE_NAME}`,
      description: options.description,
      images: [imageUrl],
    },
  }
}