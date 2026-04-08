'use client'

import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/cn'

const NAV_LINKS = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="text-xl font-extrabold tracking-tight text-gray-900">
          Dotly<span className="text-brand-500">.one</span>
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
          <Link href="/auth" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Sign in
          </Link>
          <Link
            href="/auth"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Get started free
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="flex flex-col gap-1.5 p-1 md:hidden"
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
        <div className="border-t border-gray-100 bg-white px-6 pb-6 pt-4 md:hidden">
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
