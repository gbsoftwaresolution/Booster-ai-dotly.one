'use client'

import type { JSX } from 'react'
import Image from 'next/image'
import { Palette } from 'lucide-react'

import { SelectField } from '@/components/ui/SelectField'

import { FONT_OPTIONS } from './helpers'
import type { BrandConfig } from './types'

export function TeamBrandHero(): JSX.Element {
  return (
    <div className="app-panel rounded-[30px] px-6 py-6 sm:px-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600">
          <Palette className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500/80">
            Team Identity
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Brand Settings</h1>
          <p className="mt-2 text-sm text-gray-500">
            Configure the shared brand system your public team cards use when brand lock is enabled.
          </p>
        </div>
      </div>
    </div>
  )
}

export function BrandConfigForm({
  brand,
  teamId,
  saving,
  saved,
  onChange,
  onToggleBrandLock,
  onToggleHideBranding,
  onSave,
}: {
  brand: BrandConfig
  teamId: string
  saving: boolean
  saved: boolean
  onChange: (next: BrandConfig) => void
  onToggleBrandLock: () => void
  onToggleHideBranding: () => void
  onSave: () => void
}): JSX.Element {
  return (
    <div className="app-panel space-y-5 rounded-[28px] p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Logo URL</label>
        <input
          type="url"
          value={brand.logoUrl}
          onChange={(event) => onChange({ ...brand, logoUrl: event.target.value })}
          placeholder="https://example.com/logo.png"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Primary Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={brand.primaryColor}
            onChange={(event) => onChange({ ...brand, primaryColor: event.target.value })}
            className="h-10 w-16 cursor-pointer rounded border border-gray-200"
          />
          <input
            type="text"
            value={brand.primaryColor}
            onChange={(event) => onChange({ ...brand, primaryColor: event.target.value })}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Secondary Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={brand.secondaryColor}
            onChange={(event) => onChange({ ...brand, secondaryColor: event.target.value })}
            className="h-10 w-16 cursor-pointer rounded border border-gray-200"
          />
          <input
            type="text"
            value={brand.secondaryColor}
            onChange={(event) => onChange({ ...brand, secondaryColor: event.target.value })}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Font Family</label>
        <SelectField
          value={brand.fontFamily}
          onChange={(event) => onChange({ ...brand, fontFamily: event.target.value })}
          className="focus:border-brand-500 focus:ring-brand-100"
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </SelectField>
      </div>

      <ToggleCard
        title="Brand Lock"
        description="Force team public cards to use this logo, colors, and font instead of per-card theme settings."
        enabled={brand.brandLock}
        onToggle={onToggleBrandLock}
        footer="Team logo above the card and the Dotly footer preference apply independently; brand lock controls in-card theme enforcement."
      />

      <ToggleCard
        title='Hide "Powered by Dotly"'
        description="Remove the Dotly footer on public card pages using team branding."
        enabled={brand.hideDotlyBranding}
        onToggle={onToggleHideBranding}
      />

      <button
        type="button"
        onClick={onSave}
        disabled={saving || !teamId}
        className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {saving
          ? 'Saving...'
          : saved
            ? 'Saved!'
            : !teamId
              ? 'Unavailable — team failed to load'
              : 'Save Brand Settings'}
      </button>
    </div>
  )
}

function ToggleCard({
  title,
  description,
  enabled,
  onToggle,
  footer,
}: {
  title: string
  description: string
  enabled: boolean
  onToggle: () => void
  footer?: string
}): JSX.Element {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-brand-500' : 'bg-gray-200'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>
      {footer ? <p className="mt-2 text-xs text-gray-500">{footer}</p> : null}
    </div>
  )
}

export function BrandPreview({ brand }: { brand: BrandConfig }): JSX.Element {
  return (
    <div className="app-panel rounded-[28px] p-6">
      <h3 className="mb-4 font-semibold text-gray-900">Live Preview</h3>
      <div
        className="rounded-xl p-6 shadow-md"
        style={{
          backgroundColor: brand.primaryColor,
          fontFamily: brand.fontFamily,
        }}
      >
        {brand.logoUrl ? (
          <Image
            src={brand.logoUrl}
            alt="Team logo"
            width={48}
            height={48}
            unoptimized
            className="mb-4 h-12 w-auto rounded"
          />
        ) : (
          <div
            className="mb-4 flex h-12 w-24 items-center justify-center rounded"
            style={{ backgroundColor: brand.secondaryColor }}
          >
            <span className="text-xs font-bold" style={{ color: brand.primaryColor }}>
              Logo
            </span>
          </div>
        )}
        <h4 className="text-xl font-bold" style={{ color: brand.secondaryColor }}>
          Your Name
        </h4>
        <p className="mt-1 text-sm opacity-80" style={{ color: brand.secondaryColor }}>
          Your Title · Company
        </p>
        <div
          className="mt-4 rounded-lg px-4 py-2 text-center text-sm font-semibold"
          style={{
            backgroundColor: brand.secondaryColor,
            color: brand.primaryColor,
          }}
        >
          Connect with me
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Preview of the team theme used on public cards when brand lock is enabled.
      </p>
    </div>
  )
}
