import type { Metadata } from 'next'
import Link from 'next/link'
import { StructuredData } from '@/components/seo/StructuredData'
import { Navbar } from '@/components/marketing/Navbar'
import { CtaBanner } from '@/components/marketing/CtaBanner'
import { Footer } from '@/components/marketing/Footer'
import { absoluteUrl, createMarketingMetadata } from '@/lib/seo'

export const metadata: Metadata = createMarketingMetadata({
  title: 'Features',
  description:
    'Explore how Dotly.one turns scans into bookings, WhatsApp conversations, leads, and follow-up workflows.',
  path: '/features',
  keywords: ['product features', 'booking funnel', 'WhatsApp lead capture', 'crm features'],
})

// ─── Feature detail sections ──────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'nfc-qr',
    tag: 'Start the loop',
    title: 'QR, NFC, and public card sharing',
    description:
      'Dotly is built for the first seconds after a conversation. Share with QR, NFC, or your public link so the next action happens immediately instead of getting lost in a contact list.',
    bullets: [
      'Works with modern NFC-compatible phones and QR scans',
      'QR codes stay live even when your card content changes',
      'Branded short link gives every lead one clear destination',
      'Built for events, meetings, WhatsApp bios, and social profiles',
    ],
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
        />
      </svg>
    ),
    reverse: false,
  },
  {
    id: 'analytics',
    tag: 'Know what converts',
    title: 'Real-time intent tracking',
    description:
      'See which scans, clicks, bookings, and lead captures are actually moving contacts toward conversion so your follow-up stays focused on real intent.',
    bullets: [
      'Tap and scan events with source context',
      'CTA click tracking across booking, WhatsApp, and card actions',
      'Lead capture and booking conversion signals',
      'Analytics history scales by plan',
    ],
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    ),
    reverse: true,
  },
  {
    id: 'crm',
    tag: 'Follow up faster',
    title: 'Turn scans into CRM-ready leads',
    description:
      'Every captured contact lands in Dotly so you can follow up while intent is still warm. Add notes, tag context, and keep your next action clear.',
    bullets: [
      'Lead capture submissions become contacts automatically',
      'Tags, notes, reminders, and follow-up workflows stay in one system',
      'CSV export on supported paid plans',
      'Built to support richer conversion attribution over time',
    ],
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
    reverse: false,
  },
  {
    id: 'scheduling',
    tag: 'Move to revenue',
    title: 'Booking, follow-up, and checkout',
    description:
      'Use booking links to move a lead into the next conversation, then keep follow-up organized in the same workflow. Paid upgrades support checkout for subscription billing, with public payment flows planned next.',
    bullets: [
      'Booking links connect scans directly to meetings',
      'Reminders and outreach tools help prevent leads from going cold',
      'Current paid checkout is in limited rollout',
      'Dotly keeps contact history and engagement tied together',
    ],
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625v-2.625m-16.5 2.625v-2.625"
        />
      </svg>
    ),
    reverse: true,
  },
]

const featureStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Dotly.one Features',
  url: absoluteUrl('/features'),
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: SECTIONS.map((section, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: section.title,
      description: section.description,
      url: `${absoluteUrl('/features')}#${section.id}`,
    })),
  },
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <StructuredData id="features-structured-data" data={featureStructuredData} />
      <Navbar />

      {/* Page hero */}
      <section className="border-b border-gray-100 px-6 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">Product</p>
        <h1 className="mt-2 text-5xl font-extrabold tracking-tight text-gray-900">
          Dotly is a contact-to-customer engine
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
          Share once, trigger the next action, capture intent, and keep follow-up moving from one
          system built for salespeople, freelancers, and small businesses.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/auth"
            className="rounded-xl bg-brand-500 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
          >
            Get your Dotly free
          </Link>
          <Link
            href="/pricing"
            className="rounded-xl border border-gray-300 px-8 py-3.5 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            See pricing
          </Link>
        </div>
      </section>

      {/* Feature sections */}
      <main>
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="border-b border-gray-100 px-6 py-20">
            <div
              className={`mx-auto flex max-w-6xl flex-col items-center gap-12 md:flex-row ${
                section.reverse ? 'md:flex-row-reverse' : ''
              }`}
            >
              {/* Text */}
              <div className="flex-1">
                <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
                  {section.tag}
                </p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  {section.title}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-gray-500">
                  {section.description}
                </p>
                <ul className="mt-6 space-y-2">
                  {section.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-0.5 text-brand-500">
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Icon panel */}
              <div className="flex h-56 w-56 flex-shrink-0 items-center justify-center rounded-3xl bg-brand-50 text-brand-500 shadow-inner">
                {section.icon}
              </div>
            </div>
          </section>
        ))}
      </main>

      <CtaBanner />
      <Footer />
    </div>
  )
}
