'use client'

import Link from 'next/link'
import { useState } from 'react'
import { BrandLogo } from '@/components/BrandLogo'
import { cn } from '@/lib/cn'
import { PwaInstallButton } from '@/components/PwaInstallButton'

const NAV_LINKS = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="app-shell-surface mx-auto flex max-w-7xl items-center justify-between rounded-[28px] px-5 py-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 text-xl font-extrabold tracking-tight text-gray-900"
        >
          <BrandLogo
            priority
            className="gap-2 sm:gap-3"
            iconClassName="h-8 w-8 rounded-[14px] shadow-[0_18px_40px_-24px_rgba(14,165,233,0.35)] sm:h-10 sm:w-10 sm:rounded-[18px]"
            textClassName="text-lg sm:text-xl"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <PwaInstallButton
            className="inline-flex items-center gap-2 rounded-2xl border border-sky-200/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-[0_16px_32px_-24px_rgba(14,165,233,0.35)] transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white"
            label="Install app"
          />
          <Link href="/auth" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Sign in
          </Link>
          <Link
            href="/auth"
            className="rounded-2xl bg-gradient-to-b from-sky-500 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_22px_45px_-24px_rgba(14,165,233,0.72)] transition-all hover:-translate-y-0.5 hover:brightness-[1.03]"
          >
            Get started free
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/70 bg-white/80 md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span
            className={cn(
              'block h-0.5 w-6 bg-gray-700 transition-transform',
              open && 'translate-y-2 rotate-45',
            )}
          />
          <span
            className={cn('block h-0.5 w-6 bg-gray-700 transition-opacity', open && 'opacity-0')}
          />
          <span
            className={cn(
              'block h-0.5 w-6 bg-gray-700 transition-transform',
              open && '-translate-y-2 -rotate-45',
            )}
          />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="app-shell-surface mx-auto mt-2 max-w-7xl rounded-[28px] px-6 pb-6 pt-5 md:hidden">
          <nav className="mb-4 flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-base font-medium text-gray-700 hover:text-gray-900"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2">
            <PwaInstallButton
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-center text-sm font-semibold text-sky-700 hover:bg-sky-100"
              label="Install app"
            />
            <Link
              href="/auth"
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
            <Link
              href="/auth"
              className="rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600"
              onClick={() => setOpen(false)}
            >
              Get started free
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
