'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { JSX } from 'react'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { cn } from '@/lib/cn'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiPatch } from '@/lib/api'

// ── ISO 3166-1 alpha-2 country list ──────────────────────────────────────────

const COUNTRIES: { code: string; name: string }[] = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'Congo (DRC)' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KP', name: 'Korea (North)' },
  { code: 'KR', name: 'Korea (South)' },
  { code: 'XK', name: 'Kosovo' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'São Tomé and Príncipe' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
]

// ── Searchable combobox component ─────────────────────────────────────────────

interface ComboboxProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  hint?: string
}

function Combobox({
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

  const selectedLabel = options.find((o) => o.value === value)?.label ?? ''

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  // Close dropdown when clicking outside
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleSelect(val: string) {
    onChange(val)
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
          'mt-1 flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm cursor-pointer',
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
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={open ? 'Search...' : (placeholder ?? 'Select...')}
          className="flex-1 bg-transparent outline-none text-gray-900 placeholder:text-gray-400 min-w-0"
          autoComplete="off"
        />
        <svg
          className={cn(
            'h-4 w-4 text-gray-400 shrink-0 transition-transform',
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
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-gray-400">No results</li>
          ) : (
            filtered.map((o) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(o.value)
                }}
                className={cn(
                  'cursor-pointer px-3 py-2 hover:bg-brand-50',
                  o.value === value && 'bg-brand-50 font-medium text-brand-700',
                )}
              >
                {o.label}
              </li>
            ))
          )}
        </ul>
      )}

      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

// ── Build timezone options from Intl ──────────────────────────────────────────

function getTimezoneOptions(): { value: string; label: string }[] {
  // Intl.supportedValuesOf is available in modern browsers and Node 18+
  let zones: string[]
  try {
    zones = (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf(
      'timeZone',
    )
  } catch {
    // Fallback: a small curated list of common IANA zones
    zones = [
      'Africa/Abidjan',
      'Africa/Cairo',
      'Africa/Nairobi',
      'Africa/Lagos',
      'America/Anchorage',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/New_York',
      'America/Sao_Paulo',
      'America/Toronto',
      'Asia/Bangkok',
      'Asia/Colombo',
      'Asia/Dubai',
      'Asia/Hong_Kong',
      'Asia/Jakarta',
      'Asia/Karachi',
      'Asia/Kolkata',
      'Asia/Kuala_Lumpur',
      'Asia/Seoul',
      'Asia/Shanghai',
      'Asia/Singapore',
      'Asia/Tokyo',
      'Australia/Melbourne',
      'Australia/Sydney',
      'Europe/Amsterdam',
      'Europe/Berlin',
      'Europe/Dublin',
      'Europe/Istanbul',
      'Europe/London',
      'Europe/Madrid',
      'Europe/Moscow',
      'Europe/Paris',
      'Europe/Rome',
      'Europe/Warsaw',
      'Europe/Zurich',
      'Pacific/Auckland',
      'Pacific/Honolulu',
      'UTC',
    ]
  }
  return zones.map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') }))
}

const TIMEZONE_OPTIONS = getTimezoneOptions()

// ── Country options ───────────────────────────────────────────────────────────

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` }))

// ── Detect locale from browser ────────────────────────────────────────────────

function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

function detectBrowserCountry(): string {
  try {
    const locale = navigator.language ?? 'en-US'
    // BCP 47 region subtag — e.g. "en-US" → "US", "en-GB" → "GB"
    const parts = locale.split('-')
    const region = parts[parts.length - 1] ?? ''
    if (/^[A-Z]{2}$/.test(region)) return region
    return ''
  } catch {
    return ''
  }
}

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
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Your referral link
          </div>
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

interface BillingSubscription {
  plan?: string | null
  status?: string | null
  currentPeriodEnd?: string | null
  walletAddress?: string | null
  user?: {
    plan?: string | null
    walletAddress?: string | null
  } | null
}

async function getToken(): Promise<string | undefined> {
  return getAccessToken()
}

export default function SettingsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('Profile')

  // ── Profile state ─────────────────────────────────────────────────────────
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('')
  const [timezone, setTimezone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileStatus, setProfileStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // ── Notifications state ───────────────────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)
  const [notifError, setNotifError] = useState<string | null>(null)

  // ── Billing state ─────────────────────────────────────────────────────────
  const [billing, setBilling] = useState<BillingSubscription | null>(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const enabledNotifCount = Object.values(notifPrefs).filter(Boolean).length
  const billingPlan = billing?.plan ?? billing?.user?.plan ?? 'Free'
  const billingStatus = billing?.status ?? 'No subscription'
  const focusMessage =
    activeTab === 'Profile'
      ? profileStatus === 'saved'
        ? 'Profile changes were saved successfully.'
        : profileLoadError
          ? profileLoadError
          : profileLoading
            ? 'Loading your account profile and preferences.'
            : 'Keep your personal profile complete for better account setup.'
      : activeTab === 'Billing'
        ? billingLoading
          ? 'Loading your billing subscription details.'
          : billingError
            ? billingError
            : `${billingPlan} plan currently shows ${billingStatus.toLowerCase()}.`
        : notifSaving
          ? 'Saving your notification preferences.'
          : notifError
            ? notifError
            : `${enabledNotifCount} notification preference${enabledNotifCount === 1 ? '' : 's'} enabled.`

  const loadProfile = useCallback(async () => {
    setProfileLoading(true)
    setProfileLoadError(null)
    try {
      const token = await getToken()
      if (!token) return
      const user = await apiGet<{
        name?: string
        email?: string
        country?: string | null
        timezone?: string | null
        notifLeadCaptured?: boolean
        notifWeeklyDigest?: boolean
        notifProductUpdates?: boolean
      }>('/users/me', token)
      setName(user.name ?? '')
      setEmail(user.email ?? '')
      setCountry(user.country ?? detectBrowserCountry())
      setTimezone(user.timezone ?? detectBrowserTimezone())
      setNotifPrefs((prev) => ({
        leadCaptured: user.notifLeadCaptured ?? prev.leadCaptured,
        weeklyDigest: user.notifWeeklyDigest ?? prev.weeklyDigest,
        productUpdates: user.notifProductUpdates ?? prev.productUpdates,
      }))
    } catch {
      setProfileLoadError('Could not load your profile. Retry before making changes.')
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  // Load notification prefs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIF_KEY)
      if (stored) setNotifPrefs(JSON.parse(stored) as NotifPrefs)
    } catch {
      // ignore parse errors — keep defaults
    }
  }, [])

  // Load billing when the Billing tab is active
  useEffect(() => {
    if (activeTab !== 'Billing') return
    if (billing !== null) return // already loaded
    setBillingLoading(true)
    setBillingError(null)
    void (async () => {
      try {
        const token = await getToken()
        if (!token) return
        const data = await apiGet<BillingSubscription>('/billing', token)
        setBilling(data)
      } catch {
        setBillingError('Could not load billing details.')
      } finally {
        setBillingLoading(false)
      }
    })()
  }, [activeTab, billing])

  const handleProfileSave = useCallback(async () => {
    setProfileSaving(true)
    setProfileStatus('idle')
    try {
      const token = await getToken()
      await apiPatch(
        '/users/me',
        { name, country: country || null, timezone: timezone || null },
        token,
      )
      setProfileStatus('saved')
      setTimeout(() => setProfileStatus('idle'), 3000)
    } catch {
      setProfileStatus('error')
    } finally {
      setProfileSaving(false)
    }
  }, [name, country, timezone])

  const handleNotifSave = useCallback(async () => {
    setNotifSaving(true)
    setNotifError(null)
    try {
      const token = await getToken()
      await apiPatch(
        '/users/me',
        {
          notifLeadCaptured: notifPrefs.leadCaptured,
          notifWeeklyDigest: notifPrefs.weeklyDigest,
          notifProductUpdates: notifPrefs.productUpdates,
        },
        token,
      )
      // Also persist to localStorage as a fallback cache
      try {
        localStorage.setItem(NOTIF_KEY, JSON.stringify(notifPrefs))
      } catch {
        /* ignore */
      }
      setNotifSaved(true)
      setTimeout(() => setNotifSaved(false), 3000)
    } catch {
      setNotifError('Could not save notification preferences. Please retry.')
    } finally {
      setNotifSaving(false)
    }
  }, [notifPrefs])

  return (
    <div className="space-y-6">
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
              {[
                { label: 'Active Section', value: activeTab },
                {
                  label: 'Profile State',
                  value: profileLoading ? 'Loading' : profileStatus === 'saved' ? 'Saved' : 'Ready',
                },
                { label: 'Plan', value: billingPlan },
                { label: 'Notifications On', value: enabledNotifCount },
              ].map(({ label, value }) => (
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
              {[
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
                  tone:
                    enabledNotifCount > 0
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-amber-50 text-amber-600',
                },
              ].map(({ label, value, detail, tone }) => (
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

      {/* Tabs */}
      <div className="app-panel-subtle rounded-[24px] p-2">
        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
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

      {/* Tab content */}
      <div className="app-panel rounded-[28px] p-6 sm:p-7">
        {activeTab === 'Profile' && (
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
                  <p className="mt-1 text-xs text-gray-400">
                    Email is managed by your sign-in provider and cannot be changed here.
                  </p>
                </div>

                {/* Country */}
                <div>
                  <Combobox
                    id="country-select"
                    label="Country"
                    value={country}
                    onChange={setCountry}
                    options={COUNTRY_OPTIONS}
                    placeholder="Select your country"
                    hint="Auto-detected from your browser. You can change it."
                  />
                </div>

                {/* Timezone */}
                <div>
                  <Combobox
                    id="timezone-select"
                    label="Timezone"
                    value={timezone}
                    onChange={setTimezone}
                    options={TIMEZONE_OPTIONS}
                    placeholder="Select your timezone"
                    hint="Auto-detected from your browser. Used for scheduling and date display."
                  />
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
                  <button
                    type="button"
                    onClick={() => void loadProfile()}
                    className="ml-3 underline"
                  >
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

            {billingLoading ? (
              <div className="space-y-3">
                <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
              </div>
            ) : billingError ? (
              <StatusNotice message={billingError} />
            ) : (
              <>
                <div className="app-panel-subtle rounded-[24px] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Current plan</p>
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 uppercase">
                      {billing?.user?.plan ?? 'FREE'}
                    </span>
                  </div>
                  {billing?.status && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">Status</p>
                      <span
                        className={`text-sm font-medium ${
                          billing.status === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600'
                        }`}
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
                  {billing?.user?.walletAddress && (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-gray-500">Wallet</p>
                      <p className="text-xs font-mono text-gray-600 truncate max-w-[180px]">
                        {billing.user.walletAddress}
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
                  onChange={(e) =>
                    setNotifPrefs((p) => ({ ...p, productUpdates: e.target.checked }))
                  }
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                Product updates and announcements
              </label>
            </div>

            {notifSaved && <p className="text-sm text-green-600">Preferences saved.</p>}
            {notifError && <p className="text-sm text-red-600">{notifError}</p>}

            <button
              type="button"
              onClick={() => {
                setNotifSaving(true)
                void handleNotifSave()
              }}
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
