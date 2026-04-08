'use client'

import type { JSX } from 'react'
import {
  User,
  Briefcase,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  AlignLeft,
  AtSign,
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface ProfileTabProps {
  fields: Record<string, string>
  handle: string
  onFieldChange: (key: string, value: string) => void
  onHandleChange: (handle: string) => void
}

// ── Reusable icon-prefixed input ────────────────────────────────────────────
function IconInput({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  icon: React.ElementType
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <div className="group">
      <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </label>
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-3',
          'transition-all duration-150',
          'focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/20',
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
        />
      </div>
    </div>
  )
}

// ── Reusable icon-prefixed textarea ─────────────────────────────────────────
function IconTextarea({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ElementType
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="group">
      <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </label>
      <div
        className={cn(
          'flex gap-2.5 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-3',
          'transition-all duration-150',
          'focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/20',
        )}
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
        />
      </div>
    </div>
  )
}

// ── Section heading ──────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
        {label}
      </p>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  )
}

// ── Profile Tab ──────────────────────────────────────────────────────────────
export function ProfileTab({
  fields,
  handle,
  onFieldChange,
  onHandleChange,
}: ProfileTabProps): JSX.Element {
  return (
    <div className="space-y-5">
      {/* ── Handle ── */}
      <SectionHeader label="Card URL" />
      <div className="group">
        <div
          className={cn(
            'flex items-center rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden',
            'transition-all duration-150',
            'focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/20',
          )}
        >
          <div className="flex items-center gap-2 shrink-0 pl-3.5 pr-2">
            <AtSign className="h-4 w-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
            <span className="text-sm text-gray-400 font-medium">dotly.one/</span>
          </div>
          <input
            type="text"
            value={handle}
            onChange={(e) =>
              onHandleChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
            }
            placeholder="your-handle"
            className="flex-1 bg-transparent py-3 pr-3.5 text-sm font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
          />
        </div>
        <p className="mt-1.5 px-1 text-xs text-gray-400">
          Only lowercase letters, numbers, and hyphens.
        </p>
      </div>

      {/* ── Identity ── */}
      <SectionHeader label="Identity" />
      <IconInput
        icon={User}
        label="Display Name"
        value={fields.name ?? ''}
        onChange={(v) => onFieldChange('name', v)}
        placeholder="Jane Smith"
      />
      <IconInput
        icon={Briefcase}
        label="Job Title"
        value={fields.title ?? ''}
        onChange={(v) => onFieldChange('title', v)}
        placeholder="Product Designer"
      />
      <IconInput
        icon={Building2}
        label="Company"
        value={fields.company ?? ''}
        onChange={(v) => onFieldChange('company', v)}
        placeholder="Acme Corp"
      />

      {/* ── About ── */}
      <SectionHeader label="About" />
      <IconTextarea
        icon={AlignLeft}
        label="Bio"
        value={fields.bio ?? ''}
        onChange={(v) => onFieldChange('bio', v)}
        placeholder="A short bio about yourself…"
      />

      {/* ── Contact ── */}
      <SectionHeader label="Contact" />
      <IconInput
        icon={Phone}
        label="Phone"
        value={fields.phone ?? ''}
        onChange={(v) => onFieldChange('phone', v)}
        placeholder="+1 555 000 0000"
        type="tel"
      />
      <IconInput
        icon={Mail}
        label="Email"
        value={fields.email ?? ''}
        onChange={(v) => onFieldChange('email', v)}
        placeholder="jane@example.com"
        type="email"
      />
      <IconInput
        icon={Globe}
        label="Website"
        value={fields.website ?? ''}
        onChange={(v) => onFieldChange('website', v)}
        placeholder="https://example.com"
        type="url"
      />
      <IconInput
        icon={MapPin}
        label="Address"
        value={fields.address ?? ''}
        onChange={(v) => onFieldChange('address', v)}
        placeholder="San Francisco, CA"
      />
    </div>
  )
}
