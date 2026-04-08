import Link from 'next/link'

const FOOTER_LINKS = {
  Product: [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Dashboard', href: '/dashboard' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Security', href: '#' },
  ],
  Connect: [
    { label: 'Twitter / X', href: 'https://twitter.com/dotlyone' },
    { label: 'LinkedIn', href: 'https://linkedin.com/company/dotlyone' },
    { label: 'Contact', href: 'mailto:hello@dotly.one' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="text-xl font-extrabold tracking-tight text-gray-900">
              Dotly<span className="text-brand-500">.one</span>
            </Link>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Digital business cards with NFC, QR, analytics, and Web3 payments.
            </p>
            <p className="mt-4 text-xs text-gray-400">Powered by BoosterAI PaymentVault</p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {category}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 transition-colors hover:text-gray-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 sm:flex-row">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Dotly.one — All rights reserved.
          </p>
          <p className="text-xs text-gray-400">
            Built by{' '}
            <a
              href="https://boosterai.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 hover:underline"
            >
              BoosterAI
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
