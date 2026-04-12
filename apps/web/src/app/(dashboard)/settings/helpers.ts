import type { BillingSummaryResponse } from '@dotly/types'

import type { ComboboxOption, NotifPrefs, ProfileFieldErrors, Tab } from './types'

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

export const NOTIF_KEY = 'dotly:notification_prefs'

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  leadCaptured: true,
  weeklyDigest: true,
  productUpdates: false,
}

function getTimezoneOptions(): ComboboxOption[] {
  let zones: string[]
  try {
    zones = (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf(
      'timeZone',
    )
  } catch {
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

  return zones.map((timezone) => ({
    value: timezone,
    label: timezone.replace(/_/g, ' '),
  }))
}

export const TIMEZONE_OPTIONS = getTimezoneOptions()
export const TIMEZONE_VALUE_SET = new Set(TIMEZONE_OPTIONS.map((timezone) => timezone.value))

export const COUNTRY_OPTIONS = COUNTRIES.map((country) => ({
  value: country.code,
  label: `${country.name} (${country.code})`,
}))
export const COUNTRY_CODE_SET = new Set(COUNTRIES.map((country) => country.code))

export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

export function detectBrowserCountry(): string {
  try {
    const locale = navigator.language ?? 'en-US'
    const parts = locale.split('-')
    const region = parts[parts.length - 1] ?? ''
    if (/^[A-Z]{2}$/.test(region)) return region
    return ''
  } catch {
    return ''
  }
}

export function getInitialNotifPrefs(): NotifPrefs {
  if (typeof window === 'undefined') return DEFAULT_NOTIF_PREFS

  try {
    const stored = localStorage.getItem(NOTIF_KEY)
    return stored ? (JSON.parse(stored) as NotifPrefs) : DEFAULT_NOTIF_PREFS
  } catch {
    return DEFAULT_NOTIF_PREFS
  }
}

export function validateProfileForm(
  name: string,
  country: string,
  timezone: string,
): ProfileFieldErrors {
  const trimmedName = name.trim()
  const normalizedCountry = country.trim().toUpperCase()
  const normalizedTimezone = timezone.trim()
  const fieldErrors: ProfileFieldErrors = {}

  if (trimmedName.length > 200) {
    fieldErrors.name = 'Full name must be 200 characters or less.'
  }

  if (normalizedCountry && !COUNTRY_CODE_SET.has(normalizedCountry)) {
    fieldErrors.country = 'Select a valid country.'
  }

  if (normalizedTimezone && !TIMEZONE_VALUE_SET.has(normalizedTimezone)) {
    fieldErrors.timezone = 'Select a valid timezone.'
  }

  return fieldErrors
}

export function getFocusMessage({
  activeTab,
  profileStatus,
  profileLoadError,
  profileLoading,
  billingLoading,
  billingError,
  billingPlan,
  billingStatus,
  notifSaving,
  notifError,
  enabledNotifCount,
}: {
  activeTab: Tab
  profileStatus: 'idle' | 'saved' | 'error'
  profileLoadError: string | null
  profileLoading: boolean
  billingLoading: boolean
  billingError: string | null
  billingPlan: string
  billingStatus: string
  notifSaving: boolean
  notifError: string | null
  enabledNotifCount: number
}): string {
  if (activeTab === 'Profile') {
    if (profileStatus === 'saved') return 'Profile changes were saved successfully.'
    if (profileLoadError) return profileLoadError
    if (profileLoading) return 'Loading your account profile and preferences.'
    return 'Keep your personal profile complete for better account setup.'
  }

  if (activeTab === 'Billing') {
    if (billingLoading) return 'Loading your billing subscription details.'
    if (billingError) return billingError
    return `${billingPlan} plan currently shows ${billingStatus.toLowerCase()}.`
  }

  if (notifSaving) return 'Saving your notification preferences.'
  if (notifError) return notifError

  return `${enabledNotifCount} notification preference${enabledNotifCount === 1 ? '' : 's'} enabled.`
}

export function getBillingSummary(billing: BillingSummaryResponse | null): {
  billingPlan: string
  billingStatus: string
} {
  return {
    billingPlan: billing?.plan ?? 'Free',
    billingStatus: billing?.status ?? 'No subscription',
  }
}
