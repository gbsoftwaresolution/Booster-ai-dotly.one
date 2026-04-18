'use client'

import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'

import type { BillingSummaryResponse } from '@dotly/types'

import { StatusNotice } from '@/components/ui/StatusNotice'
import { cn } from '@/lib/cn'

import { COUNTRY_OPTIONS } from './helpers'
import { TIMEZONE_OPTIONS } from './helpers'
import type { ComboboxProps, NotifPrefs, ProfileFieldErrors, Tab } from './types'
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
    <div className="group relative overflow-hidden rounded-[32px] sm:rounded-[40px] border border-white/60 bg-white/40 px-5 py-8 sm:p-10 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-700 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5">
      <div
        className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-sky-500/5 pointer-events-none"
        aria-hidden="true"
      />
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-400/10 blur-[100px] pointer-events-none" />
      <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-sky-400/10 blur-[100px] pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-8 xl:grid xl:grid-cols-[1.35fr_0.92fr] xl:items-start">
        <div className="flex flex-col items-center xl:items-start text-center xl:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50/80 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-600 ring-1 ring-inset ring-indigo-500/20 backdrop-blur-sm">
            Account
          </div>
          <h1 className="mt-4 text-[28px] font-extrabold tracking-tight text-gray-950 sm:text-[2rem] leading-tight">
            Manage your account with more confidence
          </h1>
          <p className="mt-3 max-w-[280px] sm:max-w-2xl text-sm sm:text-base font-medium text-gray-500 leading-relaxed mx-auto xl:mx-0">
            Update your profile, review billing state, and control notifications from one clearer
            settings workspace.
          </p>

          <div className="mt-8 grid w-full max-w-sm sm:max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col items-center xl:items-start rounded-[24px] border border-white/80 bg-white/60 px-4 py-4 shadow-sm backdrop-blur-md transition-transform duration-500 hover:-translate-y-1 hover:bg-white/80 hover:shadow-md ring-1 ring-black/5 text-center xl:text-left"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">
                  {label}
                </p>
                <p className="mt-1.5 text-base sm:text-lg font-extrabold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2.5 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur-md transition-all hover:bg-white active:scale-95">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            </span>
            <span className="truncate">Focus: {focusMessage}</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[32px] border border-indigo-100/50 bg-gradient-to-br from-indigo-50/60 to-sky-50/60 p-6 sm:p-8 shadow-inner backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-600">
                Account Snapshot
              </p>
              <p className="mt-1.5 text-base font-extrabold text-indigo-950">
                Control center overview
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 shadow-sm border border-indigo-100">
              <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {snapshots.map(({ label, value, detail, tone }) => (
              <div
                key={label}
                className="group/snapshot flex items-center gap-4 rounded-[24px] border border-white/60 bg-white/60 px-5 py-4 shadow-sm backdrop-blur-lg transition-all duration-300 hover:scale-[1.02] hover:bg-white hover:shadow-md"
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
  onOpenBilling,
}: {
  activeTab: Tab
  onChange: (tab: Tab) => void
  onOpenBilling: () => void
}): JSX.Element {
  return (
    <div className="app-panel-subtle rounded-[24px] p-2">
      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              if (tab === 'Billing') {
                onOpenBilling()
                return
              }
              onChange(tab)
            }}
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
  emailVerified,
  verifyEmailStatus,
  passwordStatus,
  emailChangeStatus,
  currentPassword,
  newPassword,
  confirmPassword,
  pendingEmail,
  country,
  timezone,
  profileFieldErrors,
  profileStatus,
  profileLoadError,
  profileSaving,
  verifyEmailLoading,
  passwordSaving,
  emailChangeSaving,
  onNameChange,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onPendingEmailChange,
  onCountryChange,
  onTimezoneChange,
  onResendVerification,
  onChangePassword,
  onRequestEmailChange,
  onRetry,
  onSave,
}: {
  profileLoading: boolean
  name: string
  email: string
  emailVerified: boolean
  verifyEmailStatus: string | null
  passwordStatus: string | null
  emailChangeStatus: string | null
  currentPassword: string
  newPassword: string
  confirmPassword: string
  pendingEmail: string
  country: string
  timezone: string
  profileFieldErrors: ProfileFieldErrors
  profileStatus: 'idle' | 'saved' | 'error'
  profileLoadError: string | null
  profileSaving: boolean
  verifyEmailLoading: boolean
  passwordSaving: boolean
  emailChangeSaving: boolean
  onNameChange: (value: string) => void
  onCurrentPasswordChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onPendingEmailChange: (value: string) => void
  onCountryChange: (value: string) => void
  onTimezoneChange: (value: string) => void
  onResendVerification: () => void
  onChangePassword: () => void
  onRequestEmailChange: () => void
  onRetry: () => void
  onSave: () => void
}): JSX.Element {
  return (
    <div className="space-y-6">
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
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 font-semibold',
                  emailVerified ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700',
                )}
              >
                {emailVerified ? 'Verified' : 'Verification pending'}
              </span>
              {!emailVerified ? (
                <button
                  type="button"
                  onClick={onResendVerification}
                  disabled={verifyEmailLoading}
                  className="font-medium text-brand-500 hover:text-brand-600 disabled:opacity-50"
                >
                  {verifyEmailLoading ? 'Sending…' : 'Resend verification email'}
                </button>
              ) : null}
            </div>
            {verifyEmailStatus ? (
              <p className="mt-1 text-xs text-gray-500">{verifyEmailStatus}</p>
            ) : null}
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

      <div className="grid gap-6 border-t border-gray-100 pt-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Change password</h3>
            <p className="mt-1 text-xs text-gray-500">
              Requires your current password and a recent login session.
            </p>
          </div>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => onCurrentPasswordChange(event.target.value)}
            placeholder="Current password"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(event) => onNewPasswordChange(event.target.value)}
            placeholder="New password"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            placeholder="Confirm new password"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {passwordStatus ? <p className="text-xs text-gray-500">{passwordStatus}</p> : null}
          <button
            type="button"
            onClick={onChangePassword}
            disabled={passwordSaving}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {passwordSaving ? 'Updating…' : 'Update password'}
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Change email</h3>
            <p className="mt-1 text-xs text-gray-500">
              We will verify the new email before applying the change.
            </p>
          </div>
          <input
            type="email"
            value={pendingEmail}
            onChange={(event) => onPendingEmailChange(event.target.value)}
            placeholder="New email address"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => onCurrentPasswordChange(event.target.value)}
            placeholder="Current password"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {emailChangeStatus ? <p className="text-xs text-gray-500">{emailChangeStatus}</p> : null}
          <button
            type="button"
            onClick={onRequestEmailChange}
            disabled={emailChangeSaving}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {emailChangeSaving ? 'Sending…' : 'Send email change link'}
          </button>
        </div>
      </div>
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
            href="/settings/billing"
            className="inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            {billing?.status === 'ACTIVE' ? 'Manage billing' : 'Upgrade plan'}
          </a>

          <a
            href="/settings/payments"
            className="inline-block rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Manage seller payments
          </a>
        </>
      )}
    </div>
  )
}

export function NotificationsTabContent({
  notifPrefs,
  notifSaved,
  notifSavedMessage,
  notifError,
  notifSaving,
  onChange,
  onSave,
}: {
  notifPrefs: NotifPrefs
  notifSaved: boolean
  notifSavedMessage: string
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

      {notifSaved && <p className="text-sm text-green-600">{notifSavedMessage}</p>}
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
