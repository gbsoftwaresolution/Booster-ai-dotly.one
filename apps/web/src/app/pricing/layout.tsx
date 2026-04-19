import type { Metadata } from 'next'
import { createMarketingMetadata } from '@/lib/seo'

export const metadata: Metadata = createMarketingMetadata({
  title: 'Pricing',
  description:
    'Compare Dotly.one plans for booking funnels, WhatsApp lead capture, CRM, analytics, and paid upgrades.',
  path: '/pricing',
  keywords: ['pricing', 'subscription plans', 'booking funnel pricing'],
})

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
