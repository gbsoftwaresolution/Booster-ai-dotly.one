import type { Metadata } from 'next'
import { StructuredData } from '@/components/seo/StructuredData'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { absoluteUrl, createMarketingMetadata } from '@/lib/seo'

export const metadata: Metadata = createMarketingMetadata({
  title: 'Privacy Policy',
  description:
    'Read the Dotly.one privacy policy and learn how data is collected, used, retained, and protected across the platform.',
  path: '/privacy',
  keywords: ['privacy policy', 'data protection', 'personal data'],
})

const LAST_UPDATED = 'April 8, 2026'

const privacyStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Dotly.one Privacy Policy',
  url: absoluteUrl('/privacy'),
  dateModified: '2026-04-08',
  description:
    'Dotly.one privacy policy covering data collection, usage, retention, and user rights.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <StructuredData id="privacy-structured-data" data={privacyStructuredData} />
      <Navbar />

      <main className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

          <div className="prose prose-gray mt-10 max-w-none">
            <h2>1. Introduction</h2>
            <p>
              Dotly.one (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) provides digital
              business cards, analytics, CRM, scheduling, and related product experiences through
              our website at dotly.one and related mobile applications (collectively, the
              &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and
              safeguard information about you when you use the Service.
            </p>
            <p>
              By accessing or using the Service, you agree to this Privacy Policy. If you do not
              agree, please discontinue use immediately.
            </p>

            <h2>2. Information we collect</h2>
            <h3>2.1 Information you provide directly</h3>
            <ul>
              <li>
                <strong>Account information:</strong> email address, name, and password when you
                register.
              </li>
              <li>
                <strong>Card content:</strong> profile photo, job title, company, social links,
                portfolio items, and any other content you add to your digital card.
              </li>
              <li>
                <strong>Lead capture submissions:</strong> contact details submitted by people who
                tap or scan your card.
              </li>
              <li>
                <strong>Payment information:</strong> billing and payment details needed to manage
                subscriptions and purchase flows. We do not store full credit card numbers on our
                own systems.
              </li>
            </ul>

            <h3>2.2 Information collected automatically</h3>
            <ul>
              <li>
                <strong>Usage analytics:</strong> tap/scan events, link clicks, page views, and
                session data.
              </li>
              <li>
                <strong>Device information:</strong> browser type, operating system, and IP address
                (used for approximate geo-location at city level).
              </li>
              <li>
                <strong>Cookies and local storage:</strong> session tokens and preference data. We
                do not use third-party advertising cookies.
              </li>
            </ul>

            <h2>3. How we use your information</h2>
            <ul>
              <li>Provide, maintain, and improve the Service.</li>
              <li>Populate your analytics dashboard with engagement data.</li>
              <li>
                Send transactional emails (account confirmation, subscription receipts, alerts).
              </li>
              <li>Detect and prevent fraud and abuse.</li>
              <li>Comply with legal obligations.</li>
            </ul>
            <p>
              We do <strong>not</strong> sell your personal data to third parties.
            </p>

            <h2>4. Sharing of information</h2>
            <p>We may share information with:</p>
            <ul>
              <li>
                <strong>Service providers:</strong> hosting (Railway, Vercel), database
                (PostgreSQL), email delivery (Amazon SES), error monitoring (Sentry). These
                providers process data only on our instructions.
              </li>
              <li>
                <strong>Analytics:</strong> PostHog (self-hosted or cloud, depending on your region)
                for product analytics. PostHog does not receive personally identifiable information
                beyond hashed user IDs.
              </li>
              <li>
                <strong>Legal:</strong> when required by law, court order, or to protect our rights.
              </li>
            </ul>

            <h2>5. Data retention</h2>
            <p>
              We retain your account data for as long as your account is active. Analytics events
              are retained according to your plan (7 days on Free, up to unlimited on
              Agency/Enterprise). You may request deletion of your account and associated data at
              any time by emailing <a href="mailto:privacy@dotly.one">privacy@dotly.one</a>.
            </p>

            <h2>6. Your rights</h2>
            <p>
              Depending on your jurisdiction, you may have the right to: access, correct, or delete
              your personal data; restrict or object to certain processing; and data portability. To
              exercise these rights, contact us at{' '}
              <a href="mailto:privacy@dotly.one">privacy@dotly.one</a>.
            </p>

            <h2>7. Security</h2>
            <p>
              We use industry-standard security measures including TLS 1.2+ in transit, bcrypt/SCRAM
              password hashing, and row-level security on all database tables. No method of
              transmission over the internet is 100% secure; we encourage you to use a strong,
              unique password.
            </p>

            <h2>8. Children</h2>
            <p>
              The Service is not directed to children under 16. We do not knowingly collect personal
              information from children. If you believe a child has provided us with personal data,
              contact us immediately.
            </p>

            <h2>9. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify registered users
              of material changes via email or an in-app notification. Continued use after the
              effective date constitutes acceptance.
            </p>

            <h2>10. Contact</h2>
            <p>
              Questions about this Privacy Policy should be directed to:{' '}
              <a href="mailto:privacy@dotly.one">privacy@dotly.one</a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
