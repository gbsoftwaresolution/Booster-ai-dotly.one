import type { Metadata } from 'next'
import { StructuredData } from '@/components/seo/StructuredData'
import { Navbar } from '@/components/marketing/Navbar'
import { Hero } from '@/components/marketing/Hero'
import { SocialProof } from '@/components/marketing/SocialProof'
import { Features } from '@/components/marketing/Features'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { Testimonials } from '@/components/marketing/Testimonials'
import { CtaBanner } from '@/components/marketing/CtaBanner'
import { Footer } from '@/components/marketing/Footer'
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl, createMarketingMetadata } from '@/lib/seo'

export const metadata: Metadata = createMarketingMetadata({
  title: 'Tap. Share. Convert.',
  description:
    'Digital business cards with NFC tap, QR code, real-time analytics, built-in CRM, and scheduling. Free forever plan available.',
  path: '/',
  keywords: ['digital business cards', 'nfc cards', 'qr cards', 'crm for networking'],
})

const homeStructuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION,
    email: 'hello@dotly.one',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION,
    inLanguage: 'en',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    description: SITE_DESCRIPTION,
    url: absoluteUrl('/'),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: absoluteUrl('/pricing'),
    },
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-transparent">
      <StructuredData id="home-structured-data" data={homeStructuredData} />
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <HowItWorks />
        <Testimonials />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  )
}
