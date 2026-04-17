import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'

const FOOTER_LINKS = {
  Product: [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Dashboard', href: '/dashboard' },
  ],
  Company: [{ label: 'About', href: '/about' }],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
  Connect: [{ label: 'Contact', href: 'mailto:hello@dotly.one' }],
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
              <BrandLogo
                className="gap-2 sm:gap-3"
                iconClassName="h-8 w-8 rounded-[14px] shadow-[0_18px_40px_-24px_rgba(14,165,233,0.35)] sm:h-10 sm:w-10 sm:rounded-[18px]"
                textClassName="text-lg sm:text-xl"
              />
            </Link>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Turn every contact into a customer with QR sharing, booking, WhatsApp, CRM, and
              crypto-ready follow-up.
            </p>
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
        </div>
      </div>
    </footer>
  )
}
