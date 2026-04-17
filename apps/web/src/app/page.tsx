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
import { getOnboardingNextStep, getOnboardingState } from '@/lib/onboarding'
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl, createMarketingMetadata } from '@/lib/seo'
import { getServerAccessToken } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

export const metadata: Metadata = createMarketingMetadata({
  title: 'Turn Every Contact Into a Customer',
  description:
    'Share one QR or link. Let people book, chat, or leave their details instantly, then track every lead and revenue action in one place.',
  path: '/',
  keywords: [
    'contact to customer',
    'qr sales funnel',
    'booking and lead capture',
    'crm for networking',
  ],
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

export default async function HomePage() {
  try {
    const token = await getServerAccessToken()
    if (token) {
      try {
        const state = await getOnboardingState(token)
        redirect(getOnboardingNextStep(state) ? '/onboarding' : '/dashboard')
      } catch {
        redirect('/onboarding')
      }
    }
  } catch {
    // Fall back to the public marketing homepage when auth is unavailable.
  }

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
