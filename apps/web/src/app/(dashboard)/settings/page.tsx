'use client'

import { useState, useEffect, useCallback } from 'react'
import type { JSX } from 'react'
import { cn } from '@/lib/cn'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiPatch } from '@/lib/api'

// ── Become a Partner card ─────────────────────────────────────────────────────

interface SubscriptionSummary {
  boosterAiPartnerId?: string | null
}

function BecomeAPartnerCard(): JSX.Element {
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const token = await getAccessToken()
        if (!token) return
        const sub = await apiGet<SubscriptionSummary>('/billing', token)
        setPartnerId(sub?.boosterAiPartnerId ?? null)
      } catch {
        // not subscribed yet or API unavailable — show generic CTA
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
      // ignore — clipboard blocked
    }
  }

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Become a BoosterAI Partner</h2>
          <p className="mt-1 text-sm text-gray-500 max-w-prose">
            Earn commissions by referring others to Dotly through BoosterAI&apos;s partner network.
            {partnerId
              ? ' Your referral link is pre-linked to your account — share it to get credit.'
              : ' Sign up for the partner programme and your Dotly account will be recognised automatically.'}
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
          Affiliate programme
        </span>
      </div>

      {loading ? (
        <div className="mt-4 h-9 w-48 animate-pulse rounded-lg bg-gray-100" />
      ) : partnerId ? (
        <div className="mt-4 space-y-3">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Your referral link</div>
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="text"
              readOnly
              value={referralLink}
              onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none"
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
            A Dotly subscription is required to join the partner programme.
          </p>
        </div>
      )}
    </div>
  )
}

const NOTIF_KEY = 'dotly:notification_prefs'

const tabs = ['Profile', 'Billing', 'Notifications'] as const
type Tab = (typeof tabs)[number]

interface NotifPrefs {
  leadCaptured: boolean
  weeklyDigest: boolean
  productUpdates: boolean
}

const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  leadCaptured: true,
  weeklyDigest: true,
  productUpdates: false,
}

async function getToken(): Promise<string | undefined> {
  return getAccessToken()
}

export default function SettingsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('Profile')

  // ── Profile state ─────────────────────────────────────────────────────────
  const [profileLoading, setProfileLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileStatus, setProfileStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // ── Notifications state ───────────────────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)

  // Load user profile on mount
  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        if (!token) return
        const user = await apiGet<{ name?: string; email?: string }>('/users/me', token)
        setName(user.name ?? '')
        setEmail(user.email ?? '')
      } catch {
        // H-4: Surface load errors so the user sees "error" rather than blank fields
        setProfileStatus('error')
      } finally {
        setProfileLoading(false)
      }
    }
    void load()
  }, [])

  // Load notification prefs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIF_KEY)
      if (stored) setNotifPrefs(JSON.parse(stored) as NotifPrefs)
    } catch {
      // ignore parse errors — keep defaults
    }
  }, [])

  const handleProfileSave = useCallback(async () => {
    setProfileSaving(true)
    setProfileStatus('idle')
    try {
      const token = await getToken()
      await apiPatch('/users/me', { name }, token)
      setProfileStatus('saved')
      setTimeout(() => setProfileStatus('idle'), 3000)
    } catch {
      setProfileStatus('error')
    } finally {
      setProfileSaving(false)
    }
  }, [name])

  const handleNotifSave = useCallback(() => {
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(notifPrefs))
      setNotifSaved(true)
      setTimeout(() => setNotifSaved(false), 3000)
    } catch {
      // ignore localStorage errors (e.g. private browsing full)
    }
    setNotifSaving(false)
  }, [notifPrefs])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account preferences.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {activeTab === 'Profile' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Profile Information</h2>

            {profileLoading ? (
              <div className="space-y-3">
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
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-400">Email is managed by your sign-in provider and cannot be changed here.</p>
                </div>
              </div>
            )}

            {profileStatus === 'saved' && (
              <p className="text-sm text-green-600">Profile saved successfully.</p>
            )}
            {profileStatus === 'error' && (
              <p className="text-sm text-red-600">Failed to save profile. Please try again.</p>
            )}

            <button
              type="button"
              onClick={() => void handleProfileSave()}
              disabled={profileSaving || profileLoading}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {profileSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        )}

        {activeTab === 'Billing' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Billing &amp; Plan</h2>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">Current plan: <span className="text-brand-600">Free</span></p>
              <p className="mt-1 text-sm text-gray-400">Upgrade to unlock more cards, analytics, and custom domains.</p>
            </div>
            <a
              href="/settings/billing"
              className="inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              Manage billing
            </a>
          </div>
        )}

        {activeTab === 'Notifications' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Notification Preferences</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={notifPrefs.leadCaptured}
                  onChange={(e) => setNotifPrefs((p) => ({ ...p, leadCaptured: e.target.checked }))}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                Email me when someone saves my contact
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={notifPrefs.weeklyDigest}
                  onChange={(e) => setNotifPrefs((p) => ({ ...p, weeklyDigest: e.target.checked }))}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                Weekly analytics digest
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={notifPrefs.productUpdates}
                  onChange={(e) => setNotifPrefs((p) => ({ ...p, productUpdates: e.target.checked }))}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                Product updates and announcements
              </label>
            </div>

            {notifSaved && (
              <p className="text-sm text-green-600">Preferences saved.</p>
            )}

            <button
              type="button"
              onClick={() => { setNotifSaving(true); handleNotifSave() }}
              disabled={notifSaving}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {notifSaving ? 'Saving...' : 'Save preferences'}
            </button>
          </div>
        )}
      </div>

      {/* Become a Partner — always visible */}
      <BecomeAPartnerCard />
    </div>
  )
}
