import type { Metadata } from 'next'
import { createMarketingMetadata } from '@/lib/seo'

export const metadata: Metadata = createMarketingMetadata({
  title: 'Pricing',
  description:
    'Compare Dotly.one plans for digital business cards, analytics, CRM, lead capture, and scheduling. Start free and upgrade when your workflow grows.',
  path: '/pricing',
  keywords: ['pricing', 'subscription plans', 'digital business card pricing'],
})

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}