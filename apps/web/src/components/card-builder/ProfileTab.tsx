'use client'

import type { JSX } from 'react'
import type { VcardPolicy } from '@dotly/types'
import { useState } from 'react'
import {
  User,
  Briefcase,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Map,
  AlignLeft,
  AtSign,
  Camera,
} from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa6'
import { cn } from '@/lib/cn'
import { AvatarUploader } from './AvatarUploader'

interface ProfileTabProps {
  cardId: string
  fields: Record<string, string>
  handle: string
  vcardPolicy: VcardPolicy
  onFieldChange: (key: string, value: string) => void
  onHandleChange: (handle: string) => void
  onVcardPolicyChange: (policy: VcardPolicy) => void
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

// ── Avatar picker widget ─────────────────────────────────────────────────────
function AvatarPicker({
  cardId,
  avatarUrl,
  name,
  onChange,
}: {
  cardId: string
  avatarUrl: string
  name: string
  onChange: (url: string) => void
}) {
  const [open, setOpen] = useState(false)

  // Generate initials for the placeholder
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('')

  return (
    <>
      <div className="flex flex-col items-center gap-3 py-2">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide self-start">
          Profile Photo
        </label>

        {/* Avatar circle — click to open uploader */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative h-24 w-24 rounded-full overflow-hidden ring-4 ring-gray-100 hover:ring-brand-200 transition-all focus:outline-none focus:ring-brand-400"
          aria-label="Change profile photo"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl.startsWith('http') || avatarUrl.startsWith('blob:') ? avatarUrl : `https://${avatarUrl}`} alt={name || 'Avatar'} className="h-full w-full object-cover" />
          ) : (
            // Initials placeholder
            <div
              className="h-full w-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
            >
              {initials || <User className="h-8 w-8 text-white/80" />}
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-5 w-5 text-white" />
            <span className="text-[10px] font-semibold text-white leading-none">Change</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          {avatarUrl ? 'Change photo' : 'Add profile photo'}
        </button>
      </div>

      {open && (
        <AvatarUploader
          cardId={cardId}
          currentAvatarUrl={avatarUrl || undefined}
          onAvatarChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ── Profile Tab ──────────────────────────────────────────────────────────────
export function ProfileTab({
  cardId,
  fields,
  handle,
  vcardPolicy,
  onFieldChange,
  onHandleChange,
  onVcardPolicyChange,
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

      {/* Avatar picker */}
      <AvatarPicker
        cardId={cardId}
        avatarUrl={fields.avatarUrl ?? ''}
        name={fields.name ?? ''}
        onChange={(url) => onFieldChange('avatarUrl', url)}
      />

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
        icon={FaWhatsapp}
        label="WhatsApp"
        value={fields.whatsapp ?? ''}
        onChange={(v) => onFieldChange('whatsapp', v)}
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
      <IconInput
        icon={Map}
        label="Google Maps Link"
        value={fields.mapUrl ?? ''}
        onChange={(v) => onFieldChange('mapUrl', v)}
        placeholder="https://maps.google.com/?q=..."
        type="url"
      />

      {/* ── Contact Sharing ── */}
      <SectionHeader label="Contact Sharing" />

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          Control who can download your vCard (contact file) from your public card page.
        </p>

        <div className="flex flex-col gap-2">
          {/* PUBLIC option */}
          <button
            type="button"
            onClick={() => onVcardPolicyChange('PUBLIC')}
            className={cn(
              'flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all',
              vcardPolicy === 'PUBLIC'
                ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-500/20'
                : 'border-gray-200 bg-white hover:border-gray-300',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                vcardPolicy === 'PUBLIC' ? 'border-brand-500 bg-brand-500' : 'border-gray-300',
              )}
            >
              {vcardPolicy === 'PUBLIC' && (
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </span>
            <div>
              <p className={cn('text-sm font-semibold', vcardPolicy === 'PUBLIC' ? 'text-brand-700' : 'text-gray-800')}>
                Public
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Anyone can download your contact — no sign-in required.</p>
            </div>
          </button>

          {/* MEMBERS_ONLY option */}
          <button
            type="button"
            onClick={() => onVcardPolicyChange('MEMBERS_ONLY')}
            className={cn(
              'flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all',
              vcardPolicy === 'MEMBERS_ONLY'
                ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-500/20'
                : 'border-gray-200 bg-white hover:border-gray-300',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                vcardPolicy === 'MEMBERS_ONLY' ? 'border-brand-500 bg-brand-500' : 'border-gray-300',
              )}
            >
              {vcardPolicy === 'MEMBERS_ONLY' && (
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </span>
            <div>
              <p className={cn('text-sm font-semibold', vcardPolicy === 'MEMBERS_ONLY' ? 'text-brand-700' : 'text-gray-800')}>
                Members only
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Only signed-in Dotly users can download your contact.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
