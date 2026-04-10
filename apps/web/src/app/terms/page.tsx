import type { Metadata } from 'next'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Dotly.one terms of service — your rights and responsibilities when using the platform.',
}

const LAST_UPDATED = 'April 8, 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Terms of Service</h1>
          <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

          <div className="prose prose-gray mt-10 max-w-none">
            <h2>1. Acceptance of terms</h2>
            <p>
              By creating an account or using Dotly.one (the &quot;Service&quot;), you agree to be
              bound by these Terms of Service (&quot;Terms&quot;) and our{' '}
              <a href="/privacy">Privacy Policy</a>. If you are using the Service on behalf of an
              organisation, you represent that you have authority to bind that organisation.
            </p>

            <h2>2. Eligibility</h2>
            <p>
              You must be at least 16 years old to use the Service. By using the Service you
              represent that you meet this requirement.
            </p>

            <h2>3. Your account</h2>
            <ul>
              <li>You are responsible for maintaining the confidentiality of your credentials.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>
                You must notify us immediately at{' '}
                <a href="mailto:security@dotly.one">security@dotly.one</a> if you suspect
                unauthorised access.
              </li>
              <li>
                Usernames must be appropriate — impersonation of other people or brands is
                prohibited.
              </li>
            </ul>

            <h2>4. Acceptable use</h2>
            <p>You agree not to use the Service to:</p>
            <ul>
              <li>Violate any applicable law or regulation.</li>
              <li>Transmit spam, malware, or phishing content.</li>
              <li>Collect data about other users without their consent.</li>
              <li>Attempt to reverse-engineer, scrape, or disrupt the Service.</li>
              <li>Use the Service for any unlawful financial activity.</li>
            </ul>

            <h2>5. Content ownership</h2>
            <p>
              You retain ownership of all content you upload to your digital card. By publishing
              content on Dotly.one, you grant us a non-exclusive, worldwide, royalty-free licence to
              display and distribute that content solely for the purpose of operating the Service.
            </p>
            <p>
              You represent that you have all necessary rights to any content you upload and that it
              does not infringe the intellectual property rights of any third party.
            </p>

            <h2>6. Payments and subscriptions</h2>
            <ul>
              <li>
                Published self-serve plans and payment methods may change over time. The checkout
                flow presented in-product at purchase time controls the currency, network, renewal,
                and billing method for your subscription.
              </li>
              <li>
                All payments are final. We do not offer refunds except where required by applicable
                law.
              </li>
              <li>
                Subscriptions automatically renew at the end of each billing period unless cancelled
                before the renewal date.
              </li>
              <li>
                Downgrading your plan takes effect at the end of the current billing period. Feature
                access is maintained until then.
              </li>
              <li>
                We reserve the right to change pricing with 30 days&apos; notice to registered
                users.
              </li>
            </ul>

            <h2>7. Service availability</h2>
            <p>
              We work to keep the Service available and communicate major maintenance when
              practical, but we do not guarantee uninterrupted availability unless we explicitly
              agree to that in a separate written enterprise contract.
            </p>

            <h2>8. Termination</h2>
            <p>
              We may suspend or terminate your account at our discretion if you violate these Terms
              or engage in activity harmful to other users or the Service. If the in-product delete
              flow is available for your account, you may use it to request deletion; otherwise
              contact support for assistance. After account deletion is processed, public card URLs
              associated with that account may stop resolving.
            </p>

            <h2>9. Disclaimers and limitation of liability</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. TO THE
              FULLEST EXTENT PERMITTED BY LAW, DOTLY.ONE AND BOOSTERAI SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR
              USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p>
              Our aggregate liability to you for any claim arising out of these Terms shall not
              exceed the amount you paid us in the twelve months preceding the claim.
            </p>

            <h2>10. Governing law</h2>
            <p>
              These Terms are governed by the laws of the jurisdiction in which BoosterAI is
              incorporated, without regard to conflict-of-law principles. Any disputes shall be
              resolved in the competent courts of that jurisdiction.
            </p>

            <h2>11. Changes to these terms</h2>
            <p>
              We may update these Terms from time to time. Registered users will be notified of
              material changes via email at least 14 days before the effective date. Continued use
              after the effective date constitutes acceptance of the updated Terms.
            </p>

            <h2>12. Contact</h2>
            <p>
              Questions about these Terms should be directed to:{' '}
              <a href="mailto:legal@dotly.one">legal@dotly.one</a>
              <br />
              BoosterAI / Dotly.one
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
