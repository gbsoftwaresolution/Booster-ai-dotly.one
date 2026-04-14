import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import type { JSX } from 'react'
import { AuthBoundary } from '@/components/AuthBoundary'
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt'
import { PwaProvider } from '@/components/PwaProvider'
import { PwaUpdatePrompt } from '@/components/PwaUpdatePrompt'
import { PostHogProvider } from '@/components/PostHogProvider'
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  buildMarketingOgImage,
  getMetadataBase,
} from '@/lib/seo'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-heading' })

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} - ${SITE_TAGLINE}`,
    template: '%s | Dotly.one',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: '/manifest.webmanifest',
  metadataBase: getMetadataBase(),
  keywords: SITE_KEYWORDS,
  referrer: 'origin-when-cross-origin',
  icons: {
    icon: [
      { url: '/icons/196.png', sizes: '196x196', type: 'image/png' },
      { url: '/icons/512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/180.png', sizes: '180x180', type: 'image/png' }],
  },
  alternates: {
    canonical: '/',
  },
  category: 'business networking',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: buildMarketingOgImage({
          title: SITE_TAGLINE,
          description: SITE_DESCRIPTION,
          path: '/',
        }),
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} | ${SITE_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      buildMarketingOgImage({
        title: SITE_TAGLINE,
        description: SITE_DESCRIPTION,
        path: '/',
      }),
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0ea5e9',
  colorScheme: 'light',
}

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en" dir="ltr" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased text-gray-950">
        <PostHogProvider>
          <PwaProvider>
            {children}
            <PwaUpdatePrompt />
            <PwaInstallPrompt />
          </PwaProvider>
        </PostHogProvider>
        <AuthBoundary />
      </body>
    </html>
  )
}
