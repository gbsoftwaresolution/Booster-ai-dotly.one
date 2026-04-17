import type { Metadata } from 'next'
import { StructuredData } from '@/components/seo/StructuredData'
import { Navbar } from '@/components/marketing/Navbar'
import { CtaBanner } from '@/components/marketing/CtaBanner'
import { Footer } from '@/components/marketing/Footer'
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl, createMarketingMetadata } from '@/lib/seo'

export const metadata: Metadata = createMarketingMetadata({
  title: 'About',
  description:
    'Learn about Dotly.one, the team behind its contact-to-customer product, and the principles shaping booking, lead capture, CRM, and revenue workflows.',
  path: '/about',
  keywords: ['about dotly', 'contact to customer company', 'networking platform'],
})

const VALUES = [
  {
    title: 'Privacy first',
    description:
      'You own your data. We never sell contact information, and we design Dotly so professionals stay in control of what they share and track.',
  },
  {
    title: 'Radical simplicity',
    description:
      "A tap or a scan — that's the entire UX for the person receiving your card. Complex features should be invisible until you need them.",
  },
  {
    title: 'Results you can measure',
    description:
      'A card should do more than look polished. Dotly helps you measure intent, capture leads, and turn introductions into booked conversations and revenue.',
  },
  {
    title: 'Built around action',
    description:
      'The public experience should always answer one question quickly: can this contact book, chat, or convert right now?',
  },
]

const TEAM = [
  {
    name: 'The Dotly Team',
    description:
      'We build Dotly for professionals who want a better way to share, capture intent, and follow up after real-world conversations.',
    initials: 'DT',
  },
]

const aboutStructuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Dotly.one',
    url: absoluteUrl('/about'),
    description:
      'Learn about the mission and product philosophy behind Dotly.one as a contact-to-customer platform.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION,
    email: 'hello@dotly.one',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <StructuredData id="about-structured-data" data={aboutStructuredData} />
      <Navbar />

      {/* Mission section */}
      <section className="border-b border-gray-100 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            Our mission
          </p>
          <h1 className="mt-2 text-5xl font-extrabold tracking-tight text-gray-900">
            Every contact should have a clear path to conversion
          </h1>
          <p className="mx-auto mt-6 text-lg text-gray-500 leading-relaxed">
            Paper cards get lost. Contact details get buried. Dotly.one gives every salesperson,
            freelancer, and small business a faster path from scan to booking, conversation, and
            follow-up.
          </p>
          <p className="mt-4 text-base text-gray-500 leading-relaxed">
            We started Dotly.one because most digital card tools stop at sharing. We believe the
            real product begins after the scan, when a contact needs one obvious next action and the
            owner needs a system to track and convert it.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="border-b border-gray-100 bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-3xl font-extrabold tracking-tight text-gray-900">
            What we believe
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h3 className="mb-2 text-base font-semibold text-gray-900">{v.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="border-b border-gray-100 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-10 text-3xl font-extrabold tracking-tight text-gray-900">Who we are</h2>
          {TEAM.map((member) => (
            <div key={member.name} className="flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
                {member.initials}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{member.name}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                {member.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="border-b border-gray-100 bg-gray-50 px-6 py-16 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Get in touch</h2>
          <p className="mt-3 text-sm text-gray-500">
            Questions, partnership inquiries, or just want to say hi?
          </p>
          <a
            href="mailto:hello@dotly.one"
            className="mt-5 inline-block rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
          >
            hello@dotly.one
          </a>
        </div>
      </section>

      <CtaBanner />
      <Footer />
    </div>
  )
}
