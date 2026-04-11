import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import type { JSX } from 'react'
import { AuthBoundary } from '@/components/AuthBoundary'
import { PostHogProvider } from '@/components/PostHogProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-heading' })

export const metadata: Metadata = {
  title: {
    default: 'Dotly.one — Digital Business Cards',
    template: '%s | Dotly.one',
  },
  description:
    'Create stunning digital business cards, track engagement analytics, and manage your contacts with Dotly.one.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    siteName: 'Dotly.one',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased text-gray-950">
        <PostHogProvider>{children}</PostHogProvider>
        <AuthBoundary />
      </body>
    </html>
  )
}
