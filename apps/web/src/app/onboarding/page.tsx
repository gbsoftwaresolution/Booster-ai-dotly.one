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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-sky-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-400/20 blur-[100px]" />
      <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-sky-400/20 blur-[100px]" />
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out fill-mode-both relative z-10 mx-auto max-w-4xl space-y-10">
        <div className="text-center">
          <div className="inline-flex items-center rounded-full bg-indigo-50/80 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-600 ring-1 ring-inset ring-indigo-500/20 backdrop-blur-sm">
            Onboarding
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-950 lg:text-5xl">
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
                  'rounded-[32px] border px-8 py-6 text-left transition-all duration-500',
                  isActive
                    ? 'border-indigo-200 bg-white/80 shadow-[0_12px_40px_-12px_rgba(79,70,229,0.15)] ring-1 ring-indigo-500/10 backdrop-blur-xl scale-[1.02]'
                    : 'border-white/60 bg-white/40 shadow-sm backdrop-blur-md opacity-70',
                )}
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">
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
          <div className="group relative overflow-hidden rounded-[40px] border border-white/60 bg-white/40 p-8 sm:p-12 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-700 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5">
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-white/20 pointer-events-none" />
            <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Complete your profile</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Country is required because billing and product availability depend on it.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="mt-2 block w-full rounded-2xl border border-white/60 bg-white/40 px-5 py-4 text-sm text-gray-500 backdrop-blur-sm shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setProfileErrors((current) => ({ ...current, name: '' }))
                    }}
                    placeholder="Your full name"
                    className="mt-2 block w-full rounded-2xl border border-white/80 bg-white/80 px-5 py-4 text-sm text-gray-900 backdrop-blur-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all hover:bg-white"
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
                  className="group/btn relative overflow-hidden rounded-[20px] bg-indigo-600 px-8 py-4.5 text-sm font-extrabold text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] transition-all duration-500 hover:scale-105 hover:bg-indigo-500 hover:shadow-[0_12px_40px_-10px_rgba(79,70,229,0.7)] active:scale-95 ring-1 ring-indigo-500/50 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover/btn:translate-x-[200%]" />
                  <span className="relative z-10">{profileSaving ? 'Saving profile...' : 'Continue to first card'}</span>
                </button>
              </div>

              <div className="relative overflow-hidden h-fit rounded-[32px] border border-indigo-100/50 bg-gradient-to-br from-indigo-50/60 to-sky-50/60 p-8 text-sm text-indigo-950 shadow-inner backdrop-blur-md">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/40 blur-3xl" />
                <div className="relative z-10">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">
                    Why country matters
                  </p>
                  <p className="mt-4 leading-8">
                    Your country helps Dotly show the right billing options and keeps product access
                    aligned with regional availability.
                  </p>
                  <p className="mt-8 font-semibold uppercase tracking-wider text-[10px] text-indigo-400">Detected country</p>
                  <p className="mt-1 text-lg font-bold text-indigo-900">{selectedCountryLabel}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="group relative overflow-hidden rounded-[40px] border border-white/60 bg-white/40 p-8 sm:p-12 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-700 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5">
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-white/20 pointer-events-none" />
            <div className="relative z-10 flex flex-col gap-4 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-gray-950">Create your first card</h2>
              <p className="mx-auto max-w-lg text-base font-medium text-gray-500">
                Pick a template to create your first Dotly card. You can customize it after
                onboarding.
              </p>
            </div>

            <div className="relative z-10 mt-10 grid gap-4 sm:grid-cols-2">
              {TEMPLATES.map((template) => {
                const active = selectedTemplate === template.id
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={cn(
                      'group/card relative overflow-hidden rounded-[32px] border px-6 py-6 text-left transition-all duration-500',
                      active
                        ? 'border-indigo-400 bg-white/80 shadow-[0_12px_40px_-12px_rgba(79,70,229,0.2)] ring-1 ring-indigo-500/20 scale-[1.02] backdrop-blur-xl'
                        : 'border-white/60 bg-white/40 shadow-sm backdrop-blur-md opacity-70 hover:opacity-100 hover:bg-white/60 hover:-translate-y-1 hover:shadow-lg',
                    )}
                  >
                    <p className="text-lg font-bold text-gray-900">{template.label}</p>
                    <p className="mt-2 text-sm font-medium text-gray-500">{template.description}</p>
                  </button>
                )
              })}
            </div>

            <div className="relative z-10 mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => void handleCreateCard()}
                disabled={cardSaving}
                className="group/btn relative overflow-hidden rounded-[20px] bg-indigo-600 px-8 py-4.5 text-sm font-extrabold text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] transition-all duration-500 hover:scale-105 hover:bg-indigo-500 hover:shadow-[0_12px_40px_-10px_rgba(79,70,229,0.7)] active:scale-95 ring-1 ring-indigo-500/50 disabled:opacity-50 disabled:hover:scale-100"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover/btn:translate-x-[200%]" />
                <span className="relative z-10">{cardSaving ? 'Creating your first card...' : 'Create first card and enter dashboard'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
