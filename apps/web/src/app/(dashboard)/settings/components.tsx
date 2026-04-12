'use client'

import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'

import type { BillingSummaryResponse } from '@dotly/types'

import { StatusNotice } from '@/components/ui/StatusNotice'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'
import { getAccessToken } from '@/lib/supabase/client'

import { COUNTRY_OPTIONS } from './helpers'
import { TIMEZONE_OPTIONS } from './helpers'
import type {
  ComboboxProps,
  NotifPrefs,
  ProfileFieldErrors,
  SubscriptionSummary,
  Tab,
} from './types'
import { tabs } from './types'

export function Combobox({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  hint,
}: ComboboxProps): JSX.Element {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedLabel = options.find((option) => option.value === value)?.label ?? ''
  const filtered = query.trim()
    ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  function handleSelect(nextValue: string) {
    onChange(nextValue)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div
        className={cn(
          'mt-1 flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm',
          'focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500',
          open && 'border-brand-500 ring-1 ring-brand-500',
        )}
        onClick={() => {
          setOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={open ? query : selectedLabel}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={open ? 'Search...' : (placeholder ?? 'Select...')}
          className="min-w-0 flex-1 bg-transparent text-gray-900 outline-none placeholder:text-gray-400"
          autoComplete="off"
        />
        <svg
          className={cn(
            'h-4 w-4 shrink-0 text-gray-400 transition-transform',
            open && 'rotate-180',
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white text-sm shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-gray-400">No results</li>
          ) : (
            filtered.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(event) => {
                  event.preventDefault()
                  handleSelect(option.value)
                }}
                className={cn(
                  'cursor-pointer px-3 py-2 hover:bg-brand-50',
                  option.value === value && 'bg-brand-50 font-medium text-brand-700',
                )}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      )}

      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export function SettingsHero({
  activeTab,
  focusMessage,
  profileLoading,
  profileStatus,
  billingLoading,
  billingPlan,
  billingStatus,
  enabledNotifCount,
  name,
  email,
}: {
  activeTab: Tab
  focusMessage: string
  profileLoading: boolean
  profileStatus: 'idle' | 'saved' | 'error'
  billingLoading: boolean
  billingPlan: string
  billingStatus: string
  enabledNotifCount: number
  name: string
  email: string
}): JSX.Element {
  const metrics = [
    { label: 'Active Section', value: activeTab },
    {
      label: 'Profile State',
      value: profileLoading ? 'Loading' : profileStatus === 'saved' ? 'Saved' : 'Ready',
    },
    { label: 'Plan', value: billingPlan },
    { label: 'Notifications On', value: enabledNotifCount },
  ]

  const snapshots = [
    {
      label: 'Profile readiness',
      value: profileLoading ? '—' : name ? 'Ready' : 'Add info',
      detail: name
        ? `Signed in as ${email || 'account owner'}`
        : 'Add your name to complete profile setup',
      tone: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Billing state',
      value: billingLoading ? '—' : billingPlan,
      detail: billingLoading ? 'Loading plan details' : billingStatus,
      tone: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Notification coverage',
      value: `${enabledNotifCount}`,
      detail: `${enabledNotifCount} preference${enabledNotifCount === 1 ? '' : 's'} currently enabled`,
      tone: enabledNotifCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
    },
  ]

  return (
    <div className="app-panel relative overflow-hidden rounded-[34px] px-6 py-6 sm:px-8 sm:py-7">
      <div
        className="absolute inset-0 opacity-90"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(14,165,233,0.12), transparent 34%), radial-gradient(circle at right center, rgba(99,102,241,0.10), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(248,250,252,0.98))',
        }}
      />
      <div className="relative grid gap-5 xl:grid-cols-[1.35fr_0.92fr] xl:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">
            Account
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-[2rem]">
            Manage your account with more confidence
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-[15px]">
            Update your profile, review billing state, and control notifications from one clearer
            settings workspace.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">
            {metrics.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-[22px] border border-white/80 bg-white/85 px-3 py-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.2)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  {label}
                </p>
                <p className="mt-1 text-sm font-bold text-gray-900 sm:text-base">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            </span>
            <span className="truncate">Focus: {focusMessage}</span>
          </div>
        </div>

        <div className="app-panel-subtle rounded-[30px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                Account Snapshot
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">Control center overview</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-600 shadow-sm">
              Live
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {snapshots.map(({ label, value, detail, tone }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/80 px-4 py-3"
              >
                <span
                  className={`${tone} flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl`}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-current" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {label}
                  </p>
                  <p className="truncate text-sm text-gray-500">{detail}</p>
                </div>
                <span className="shrink-0 text-lg font-bold tabular-nums text-gray-900">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function SettingsTabs({
  activeTab,
  onChange,
}: {
  activeTab: Tab
  onChange: (tab: Tab) => void
}): JSX.Element {
  return (
    <div className="app-panel-subtle rounded-[24px] p-2">
      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={cn(
              'whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-white text-brand-600 shadow-sm ring-1 ring-white/80'
                : 'text-gray-500 hover:bg-white/70 hover:text-gray-700',
            )}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  )
}

export function ProfileTabContent({
  profileLoading,
  name,
  email,
  country,
  timezone,
  profileFieldErrors,
  profileStatus,
  profileLoadError,
  profileSaving,
  onNameChange,
  onCountryChange,
  onTimezoneChange,
  onRetry,
  onSave,
}: {
  profileLoading: boolean
  name: string
  email: string
  country: string
  timezone: string
  profileFieldErrors: ProfileFieldErrors
  profileStatus: 'idle' | 'saved' | 'error'
  profileLoadError: string | null
  profileSaving: boolean
  onNameChange: (value: string) => void
  onCountryChange: (value: string) => void
  onTimezoneChange: (value: string) => void
  onRetry: () => void
  onSave: () => void
}): JSX.Element {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Profile Information</h2>

      {profileLoading ? (
        <div className="space-y-3">
          <div className="h-9 w-full animate-pulse rounded-lg bg-gray-100" />
          <div className="h-9 w-full animate-pulse rounded-lg bg-gray-100" />
          <div className="h-9 w-full animate-pulse rounded-lg bg-gray-100" />
          <div className="h-9 w-full animate-pulse rounded-lg bg-gray-100" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Your name"
              maxLength={200}
              aria-invalid={profileFieldErrors.name ? 'true' : 'false'}
              aria-describedby={profileFieldErrors.name ? 'profile-name-error' : undefined}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${profileFieldErrors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500'}`}
            />
            {profileFieldErrors.name && (
              <p id="profile-name-error" className="mt-1 text-xs text-red-600">
                {profileFieldErrors.name}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className="mt-1 block w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400"
            />
            <p className="mt-1 text-xs text-gray-400">
              Email is managed by your sign-in provider and cannot be changed here.
            </p>
          </div>

          <div>
            <Combobox
              id="country-select"
              label="Country"
              value={country}
              onChange={onCountryChange}
              options={COUNTRY_OPTIONS}
              placeholder="Select your country"
              hint="Auto-detected from your browser. You can change it."
            />
            {profileFieldErrors.country && (
              <p className="mt-1 text-xs text-red-600">{profileFieldErrors.country}</p>
            )}
          </div>

          <div>
            <Combobox
              id="timezone-select"
              label="Timezone"
              value={timezone}
              onChange={onTimezoneChange}
              options={TIMEZONE_OPTIONS}
              placeholder="Select your timezone"
              hint="Auto-detected from your browser. Used for scheduling and date display."
            />
            {profileFieldErrors.timezone && (
              <p className="mt-1 text-xs text-red-600">{profileFieldErrors.timezone}</p>
            )}
          </div>
        </div>
      )}

      {profileStatus === 'saved' && (
        <p className="text-sm text-green-600">Profile saved successfully.</p>
      )}
      {profileLoadError && (
        <StatusNotice
          message={profileLoadError}
          action={
            <button type="button" onClick={onRetry} className="ml-3 underline">
              Retry
            </button>
          }
        />
      )}
      {profileStatus === 'error' && !profileLoadError && (
        <p className="text-sm text-red-600">Failed to save profile. Please try again.</p>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={profileSaving || profileLoading}
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {profileSaving ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  )
}

export function BillingTabContent({
  billingLoading,
  billingError,
  billing,
}: {
  billingLoading: boolean
  billingError: string | null
  billing: BillingSummaryResponse | null
}): JSX.Element {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Billing &amp; Plan</h2>

      {billingLoading ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
        </div>
      ) : billingError ? (
        <StatusNotice message={billingError} />
      ) : (
        <>
          <div className="app-panel-subtle space-y-2 rounded-[24px] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Current plan</p>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-indigo-700">
                {billing?.plan ?? 'FREE'}
              </span>
            </div>
            {billing?.status && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`text-sm font-medium ${billing.status === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600'}`}
                >
                  {billing.status}
                </span>
              </div>
            )}
            {billing?.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Renews</p>
                <p className="text-sm text-gray-700">
                  {new Date(billing.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            )}
            {billing?.walletAddress && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-500">Wallet</p>
                <p className="max-w-[180px] truncate text-xs font-mono text-gray-600">
                  {billing.walletAddress}
                </p>
              </div>
            )}
            {!billing?.status && (
              <p className="text-sm text-gray-400">
                Upgrade to unlock more cards, analytics, and custom domains.
              </p>
            )}
          </div>

          <a
            href="/pricing"
            className="inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            {billing?.status === 'ACTIVE' ? 'Manage billing' : 'Upgrade plan'}
          </a>
        </>
      )}
    </div>
  )
}

export function NotificationsTabContent({
  notifPrefs,
  notifSaved,
  notifError,
  notifSaving,
  onChange,
  onSave,
}: {
  notifPrefs: NotifPrefs
  notifSaved: boolean
  notifError: string | null
  notifSaving: boolean
  onChange: (prefs: NotifPrefs) => void
  onSave: () => void
}): JSX.Element {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Notification Preferences</h2>
      <div className="space-y-3">
        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={notifPrefs.leadCaptured}
            onChange={(event) => onChange({ ...notifPrefs, leadCaptured: event.target.checked })}
            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          Email me when someone saves my contact
        </label>
        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={notifPrefs.weeklyDigest}
            onChange={(event) => onChange({ ...notifPrefs, weeklyDigest: event.target.checked })}
            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          Weekly analytics digest
        </label>
        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={notifPrefs.productUpdates}
            onChange={(event) => onChange({ ...notifPrefs, productUpdates: event.target.checked })}
            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          Product updates and announcements
        </label>
      </div>

      {notifSaved && <p className="text-sm text-green-600">Preferences saved.</p>}
      {notifError && <p className="text-sm text-red-600">{notifError}</p>}

      <button
        type="button"
        onClick={onSave}
        disabled={notifSaving}
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {notifSaving ? 'Saving...' : 'Save preferences'}
      </button>
    </div>
  )
}

export function BecomeAPartnerCard(): JSX.Element {
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const token = await getAccessToken()
        if (!token) return
        const subscription = await apiGet<SubscriptionSummary>('/billing', token)
        setPartnerId(subscription?.boosterAiPartnerId ?? null)
      } catch {
        // Show the generic CTA when partner data is unavailable.
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const referralLink = partnerId
    ? `https://boosterai.space/auth/signup?ref=p_${partnerId}`
    : 'https://boosterai.space/auth/signup'

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Ignore clipboard failures.
    }
  }

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Become a BoosterAI Partner</h2>
          <p className="mt-1 max-w-prose text-sm text-gray-500">
            Earn commissions by referring others to Dotly through BoosterAI&apos;s partner network.
            {partnerId
              ? ' Your referral link is pre-linked to your account — share it to get credit.'
              : ' Sign up for the partner programme and your Dotly account can be linked automatically when you use the same email address.'}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
          Affiliate programme
        </span>
      </div>

      {loading ? (
        <div className="mt-4 h-9 w-48 animate-pulse rounded-lg bg-gray-100" />
      ) : partnerId ? (
        <div className="mt-4 space-y-3">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Your referral link
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              onFocus={(event) => event.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none"
              aria-label="Your BoosterAI referral link"
            />
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="shrink-0 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Anyone who signs up via this link will be attributed to your partner account.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={referralLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Sign up as a partner
          </a>
          <p className="self-center text-xs text-gray-400">
            Joining the partner programme does not require a paid Dotly subscription.
          </p>
        </div>
      )}
    </div>
  )
}
