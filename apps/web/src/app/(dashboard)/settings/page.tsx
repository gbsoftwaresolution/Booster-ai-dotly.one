'use client'

import { useState, useEffect, useCallback } from 'react'
import type { JSX } from 'react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiPatch } from '@/lib/api'
import type { BillingSummaryResponse, UserMeResponse } from '@dotly/types'
import {
  BillingTabContent,
  NotificationsTabContent,
  ProfileTabContent,
  SettingsHero,
  SettingsTabs,
} from './components'
import {
  DEFAULT_NOTIF_PREFS,
  detectBrowserCountry,
  detectBrowserTimezone,
  getBillingSummary,
  getFocusMessage,
  getInitialNotifPrefs,
  validateProfileForm,
} from './helpers'
import type { NotifPrefs, ProfileFieldErrors, Tab } from './types'

async function getToken(): Promise<string | undefined> {
  return getAccessToken()
}

export default function SettingsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('Profile')

  const [profileLoading, setProfileLoading] = useState(true)
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('')
  const [timezone, setTimezone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileStatus, setProfileStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [profileFieldErrors, setProfileFieldErrors] = useState<ProfileFieldErrors>({})

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(getInitialNotifPrefs)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)
  const [notifError, setNotifError] = useState<string | null>(null)

  const [billing, setBilling] = useState<BillingSummaryResponse | null>(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const enabledNotifCount = Object.values(notifPrefs).filter(Boolean).length
  const { billingPlan, billingStatus } = getBillingSummary(billing)
  const focusMessage = getFocusMessage({
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
  })

  const loadProfile = useCallback(async () => {
    setProfileLoading(true)
    setProfileLoadError(null)
    try {
      const token = await getToken()
      if (!token) return
      const user = await apiGet<UserMeResponse | null>('/users/me', token)
      if (!user) throw new Error('User profile missing')
      setName(user.name ?? '')
      setEmail(user.email ?? '')
      setCountry(user.country ?? detectBrowserCountry())
      setTimezone(user.timezone ?? detectBrowserTimezone())
      setNotifPrefs({
        leadCaptured: user.notifLeadCaptured ?? DEFAULT_NOTIF_PREFS.leadCaptured,
        weeklyDigest: user.notifWeeklyDigest ?? DEFAULT_NOTIF_PREFS.weeklyDigest,
        productUpdates: user.notifProductUpdates ?? DEFAULT_NOTIF_PREFS.productUpdates,
      })
    } catch {
      setProfileLoadError('Could not load your profile. Retry before making changes.')
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  useEffect(() => {
    if (activeTab !== 'Billing') return
    if (billing !== null) return
    setBillingLoading(true)
    setBillingError(null)

    void (async () => {
      try {
        const token = await getToken()
        if (!token) return
        const data = await apiGet<BillingSummaryResponse>('/billing', token)
        setBilling(data)
      } catch {
        setBillingError('Could not load billing details.')
      } finally {
        setBillingLoading(false)
      }
    })()
  }, [activeTab, billing])

  const handleProfileSave = useCallback(async () => {
    const trimmedName = name.trim()
    const normalizedCountry = country.trim().toUpperCase()
    const normalizedTimezone = timezone.trim()
    const nextFieldErrors = validateProfileForm(trimmedName, normalizedCountry, normalizedTimezone)

    if (Object.keys(nextFieldErrors).length > 0) {
      setProfileFieldErrors(nextFieldErrors)
      setProfileStatus('error')
      return
    }

    setProfileSaving(true)
    setProfileStatus('idle')
    setProfileFieldErrors({})
    try {
      const token = await getToken()
      await apiPatch(
        '/users/me',
        {
          name: trimmedName || null,
          country: normalizedCountry || null,
          timezone: normalizedTimezone || null,
        },
        token,
      )

      setName(trimmedName)
      setCountry(normalizedCountry)
      setTimezone(normalizedTimezone)
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

      try {
        localStorage.setItem('dotly:notification_prefs', JSON.stringify(notifPrefs))
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
      <SettingsHero
        activeTab={activeTab}
        focusMessage={focusMessage}
        profileLoading={profileLoading}
        profileStatus={profileStatus}
        billingLoading={billingLoading}
        billingPlan={billingPlan}
        billingStatus={billingStatus}
        enabledNotifCount={enabledNotifCount}
        name={name}
        email={email}
      />

      <SettingsTabs activeTab={activeTab} onChange={setActiveTab} />

      <div className="app-panel rounded-[28px] p-6 sm:p-7">
        {activeTab === 'Profile' && (
          <ProfileTabContent
            profileLoading={profileLoading}
            name={name}
            email={email}
            country={country}
            timezone={timezone}
            profileFieldErrors={profileFieldErrors}
            profileStatus={profileStatus}
            profileLoadError={profileLoadError}
            profileSaving={profileSaving}
            onNameChange={(value) => {
              setName(value)
              setProfileFieldErrors((prev) => ({ ...prev, name: undefined }))
            }}
            onCountryChange={(value) => {
              setCountry(value)
              setProfileFieldErrors((prev) => ({ ...prev, country: undefined }))
            }}
            onTimezoneChange={(value) => {
              setTimezone(value)
              setProfileFieldErrors((prev) => ({ ...prev, timezone: undefined }))
            }}
            onRetry={() => void loadProfile()}
            onSave={() => void handleProfileSave()}
          />
        )}

        {activeTab === 'Billing' && (
          <BillingTabContent
            billingLoading={billingLoading}
            billingError={billingError}
            billing={billing}
          />
        )}

        {activeTab === 'Notifications' && (
          <NotificationsTabContent
            notifPrefs={notifPrefs}
            notifSaved={notifSaved}
            notifError={notifError}
            notifSaving={notifSaving}
            onChange={setNotifPrefs}
            onSave={() => void handleNotifSave()}
          />
        )}
      </div>
    </div>
  )
}
