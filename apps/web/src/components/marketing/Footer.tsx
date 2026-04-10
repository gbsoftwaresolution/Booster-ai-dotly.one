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
    <footer className="border-t border-gray-100 bg-white/45 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-3 text-xl font-extrabold tracking-tight text-gray-900"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-[18px] shadow-[0_18px_40px_-24px_rgba(14,165,233,0.7)]"
                style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="3.5" fill="white" />
                  <circle
                    cx="8"
                    cy="8"
                    r="6.5"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                  />
                </svg>
              </span>
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
