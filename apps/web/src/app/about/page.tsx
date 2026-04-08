import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/marketing/Navbar'
import { CtaBanner } from '@/components/marketing/CtaBanner'
import { Footer } from '@/components/marketing/Footer'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Dotly.one is built by BoosterAI to help professionals share smarter with digital business cards powered by NFC, analytics, and Web3 payments.',
}

const VALUES = [
  {
    title: 'Privacy first',
    description:
      'You own your data. We never sell contact information, and every payment goes directly on-chain — no intermediary holds your funds.',
  },
  {
    title: 'Radical simplicity',
    description:
      "A tap or a scan — that's the entire UX for the person receiving your card. Complex features should be invisible until you need them.",
  },
  {
    title: 'Web3-native',
    description:
      'USDT payments through a fully audited smart contract. No bank accounts, no geographic restrictions, no chargebacks.',
  },
  {
    title: 'Built for scale',
    description:
      "Whether you're a solo freelancer or a 500-person enterprise, the same card infrastructure handles your team with zero config.",
  },
]

const TEAM = [
  {
    name: 'BoosterAI Engineering',
    description:
      'The team behind Dotly.one builds AI-powered growth tools at BoosterAI.pro. We dogfood Dotly.one at every conference and client meeting.',
    initials: 'BA',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Mission section */}
      <section className="border-b border-gray-100 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            Our mission
          </p>
          <h1 className="mt-2 text-5xl font-extrabold tracking-tight text-gray-900">
            Networking should be effortless
          </h1>
          <p className="mx-auto mt-6 text-lg text-gray-500 leading-relaxed">
            Paper cards get lost. LinkedIn requests get ignored. Dotly.one gives every professional
            a living, shareable identity that works with a single tap — and keeps working after the
            handshake.
          </p>
          <p className="mt-4 text-base text-gray-500 leading-relaxed">
            We started Dotly.one because we were tired of carrying stacks of paper cards to events,
            only to have contacts forget who we were three days later. A digital card with real-time
            analytics and a built-in CRM changes that entirely.
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
              <a
                href="https://boosterai.pro"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 text-sm font-medium text-brand-500 hover:underline"
              >
                boosterai.pro &rarr;
              </a>
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
