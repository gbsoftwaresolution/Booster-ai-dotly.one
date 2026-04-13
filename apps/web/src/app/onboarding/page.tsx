'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { JSX } from 'react'
import type { CardTemplate, UserMeResponse } from '@dotly/types'
import { CardTemplate as CardTemplateEnum } from '@dotly/types'
import { apiGet, apiPatch, apiPost, isApiError } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import {
  COUNTRY_OPTIONS,
  detectBrowserCountry,
  detectBrowserTimezone,
  TIMEZONE_OPTIONS,
  validateProfileForm,
} from '../(dashboard)/settings/helpers'
import { Combobox } from '../(dashboard)/settings/components'
import { getOnboardingNextStep } from '@/lib/onboarding'
import { cn } from '@/lib/cn'

type Step = 'profile' | 'card'

const TEMPLATES: { id: CardTemplate; label: string; description: string }[] = [
  {
    id: CardTemplateEnum.MINIMAL,
    label: 'Minimal',
    description: 'Clean and versatile for most professionals.',
  },
  {
    id: CardTemplateEnum.BOLD,
    label: 'Bold',
    description: 'High-contrast style with stronger visual presence.',
  },
  {
    id: CardTemplateEnum.CREATIVE,
    label: 'Creative',
    description: 'More expressive layout for creators and founders.',
  },
  {
    id: CardTemplateEnum.CORPORATE,
    label: 'Corporate',
    description: 'Structured layout suited to business teams.',
  },
]

async function getToken() {
  return getAccessToken()
}

function getCardPlanLimitMessage(error: unknown): string | null {
  if (!isApiError(error) || error.code !== 'PLAN_LIMIT_REACHED') return null
  return error instanceof Error ? error.message : 'Your current plan cannot create another card.'
}

export default function OnboardingPage(): JSX.Element {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('profile')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('')
  const [timezone, setTimezone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})

  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate>(CardTemplateEnum.MINIMAL)
  const [cardSaving, setCardSaving] = useState(false)

  const selectedCountryLabel = useMemo(
    () => COUNTRY_OPTIONS.find((option) => option.value === country)?.label ?? 'Auto-detected',
    [country],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) {
        router.replace('/auth?next=%2Fonboarding')
        return
      }

      const [user, cards] = await Promise.all([
        apiGet<UserMeResponse>('/users/me', token),
        apiGet<{ items?: Array<{ id: string }> }>('/cards', token),
      ])

      setName(user.name ?? '')
      setEmail(user.email ?? '')
      setCountry(user.country ?? detectBrowserCountry())
      setTimezone(user.timezone ?? detectBrowserTimezone())

      const nextStep = getOnboardingNextStep({
        profileComplete:
          Boolean(user.name?.trim()) && Boolean((user.country ?? detectBrowserCountry()).trim()),
        hasCard: (cards.items?.length ?? 0) > 0,
      })

      if (!nextStep) {
        router.replace('/dashboard')
        return
      }

      setStep(nextStep)
    } catch {
      setError('Could not load onboarding. Refresh and try again.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void load()
  }, [load])

  const handleProfileContinue = useCallback(async () => {
    const normalizedName = name.trim()
    const normalizedCountry = country.trim().toUpperCase()
    const normalizedTimezone = timezone.trim() || detectBrowserTimezone()
    const fieldErrors = validateProfileForm(normalizedName, normalizedCountry, normalizedTimezone)
    if (Object.keys(fieldErrors).length > 0) {
      setProfileErrors(fieldErrors)
      return
    }

    setProfileSaving(true)
    setProfileErrors({})
    setError(null)
    try {
      const token = await getToken()
      await apiPatch(
        '/users/me',
        {
          name: normalizedName,
          country: normalizedCountry,
          timezone: normalizedTimezone,
        },
        token,
      )
      setCountry(normalizedCountry)
      setTimezone(normalizedTimezone)
      setStep('card')
    } catch {
      setError('Could not save your profile. Please try again.')
    } finally {
      setProfileSaving(false)
    }
  }, [name, country, timezone])

  const handleCreateCard = useCallback(async () => {
    setCardSaving(true)
    setError(null)
    try {
      const token = await getToken()
      await apiPost('/cards', { templateId: selectedTemplate }, token)
      router.replace('/dashboard')
      router.refresh()
    } catch (err) {
      setError(
        getCardPlanLimitMessage(err) ??
          (err instanceof Error ? err.message : 'Could not create your first card.'),
      )
      setCardSaving(false)
    }
  }, [router, selectedTemplate])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="app-shell-surface rounded-[32px] px-6 py-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Preparing your onboarding...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#ffffff_48%,#f8fafc_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">
            Onboarding
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-gray-950">
            Set up Dotly before you enter the workspace.
          </h1>
          <p className="mt-3 text-sm text-gray-500 sm:text-base">
            Complete your profile, confirm your country, and create your first card.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { key: 'profile', title: '1. Profile', ready: step === 'card' },
            { key: 'card', title: '2. First Card', ready: false },
          ].map((item, index) => {
            const isActive = step === item.key
            return (
              <div
                key={item.key}
                className={cn(
                  'rounded-[24px] border px-4 py-4 text-left',
                  isActive ? 'border-sky-200 bg-sky-50/70' : 'border-gray-200 bg-white',
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Step {index + 1}
                </p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{item.title}</p>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {step === 'profile' ? (
          <div className="app-shell-surface rounded-[32px] p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Complete your profile</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Country is required because billing and product availability depend on it.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="mt-1 block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setProfileErrors((current) => ({ ...current, name: '' }))
                    }}
                    placeholder="Your full name"
                    className="mt-1 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  {profileErrors.name && (
                    <p className="mt-1 text-xs text-red-600">{profileErrors.name}</p>
                  )}
                </div>

                <Combobox
                  id="onboarding-country"
                  label="Country"
                  value={country}
                  onChange={(value) => {
                    setCountry(value)
                    setProfileErrors((current) => ({ ...current, country: '' }))
                  }}
                  options={COUNTRY_OPTIONS}
                  placeholder="Select your country"
                  hint="Auto-filled from your browser when possible, but required before continuing."
                />
                {profileErrors.country && (
                  <p className="-mt-4 text-xs text-red-600">{profileErrors.country}</p>
                )}

                <Combobox
                  id="onboarding-timezone"
                  label="Timezone"
                  value={timezone}
                  onChange={(value) => {
                    setTimezone(value)
                    setProfileErrors((current) => ({ ...current, timezone: '' }))
                  }}
                  options={TIMEZONE_OPTIONS}
                  placeholder="Select your timezone"
                  hint="Auto-filled from your browser."
                />
                {profileErrors.timezone && (
                  <p className="-mt-4 text-xs text-red-600">{profileErrors.timezone}</p>
                )}

                <button
                  type="button"
                  onClick={() => void handleProfileContinue()}
                  disabled={profileSaving}
                  className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {profileSaving ? 'Saving profile...' : 'Continue to first card'}
                </button>
              </div>

              <div className="rounded-[28px] border border-sky-100 bg-sky-50/70 p-5 text-sm text-sky-900">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                  Why country matters
                </p>
                <p className="mt-3 leading-7">
                  Your country helps Dotly show the right billing options and keeps product access
                  aligned with regional availability.
                </p>
                <p className="mt-4 font-medium">Detected country</p>
                <p className="mt-1 text-sky-700">{selectedCountryLabel}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="app-shell-surface rounded-[32px] p-6 sm:p-8">
            <div className="flex flex-col gap-3 text-center">
              <h2 className="text-2xl font-bold text-gray-900">Create your first card</h2>
              <p className="text-sm text-gray-500">
                Pick a template to create your first Dotly card. You can customize it after
                onboarding.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {TEMPLATES.map((template) => {
                const active = selectedTemplate === template.id
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={cn(
                      'rounded-[24px] border px-5 py-5 text-left transition',
                      active
                        ? 'border-sky-300 bg-sky-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300',
                    )}
                  >
                    <p className="text-lg font-semibold text-gray-900">{template.label}</p>
                    <p className="mt-2 text-sm text-gray-500">{template.description}</p>
                  </button>
                )
              })}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => void handleCreateCard()}
                disabled={cardSaving}
                className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {cardSaving
                  ? 'Creating your first card...'
                  : 'Create first card and enter dashboard'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
