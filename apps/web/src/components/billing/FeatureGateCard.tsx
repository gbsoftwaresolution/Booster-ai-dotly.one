'use client'

import Link from 'next/link'
import type { JSX, ReactNode } from 'react'

interface FeatureGateCardProps {
  eyebrow?: string
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  secondary?: ReactNode
}

export function FeatureGateCard({
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaHref,
  secondary,
}: FeatureGateCardProps): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl rounded-[28px] border border-white/75 bg-white/88 p-8 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-10">
      {eyebrow && <p className="text-sm font-semibold text-brand-600">{eyebrow}</p>}
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">{title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600">{description}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={ctaHref}
          className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-b from-sky-500 to-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_22px_45px_-24px_rgba(14,165,233,0.72)]"
        >
          {ctaLabel}
        </Link>
      </div>
      {secondary && <div className="mt-4 text-sm text-gray-500">{secondary}</div>}
    </div>
  )
}
