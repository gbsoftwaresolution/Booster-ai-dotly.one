'use client'

import { useState, useEffect, useCallback } from 'react'
import type { JSX } from 'react'
import { useRouter } from 'next/navigation'
import { getAccessToken } from '@/lib/auth/client'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { enqueueNotificationPrefsMutation } from '@/lib/pwa/queue'
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
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('Profile')

  const [profileLoading, setProfileLoading] = useState(true)
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [country, setCountry] = useState('')
  const [timezone, setTimezone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileStatus, setProfileStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [profileFieldErrors, setProfileFieldErrors] = useState<ProfileFieldErrors>({})
  const [verifyEmailLoading, setVerifyEmailLoading] = useState(false)
  const [verifyEmailStatus, setVerifyEmailStatus] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState('')
  const [emailChangeSaving, setEmailChangeSaving] = useState(false)
  const [emailChangeStatus, setEmailChangeStatus] = useState<string | null>(null)

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(getInitialNotifPrefs)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)
  const [notifSavedMessage, setNotifSavedMessage] = useState('Preferences saved.')
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
      setEmailVerified(Boolean(user.emailVerifiedAt))
      setPendingEmail(user.email ?? '')
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
      const payload = {
        notifLeadCaptured: notifPrefs.leadCaptured,
        notifWeeklyDigest: notifPrefs.weeklyDigest,
        notifProductUpdates: notifPrefs.productUpdates,
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const queuedCount = enqueueNotificationPrefsMutation(payload)
        try {
          localStorage.setItem('dotly:notification_prefs', JSON.stringify(notifPrefs))
        } catch {
          /* ignore */
        }
        setNotifSavedMessage(
          `Preferences saved offline. ${queuedCount} queued change${queuedCount === 1 ? '' : 's'} will sync when you reconnect.`,
        )
        setNotifSaved(true)
        setTimeout(() => setNotifSaved(false), 4000)
        return
      }

      const token = await getToken()
      await apiPatch('/users/me', payload, token)

      try {
        localStorage.setItem('dotly:notification_prefs', JSON.stringify(notifPrefs))
      } catch {
        /* ignore */
      }
      setNotifSavedMessage('Preferences saved.')
      setNotifSaved(true)
      setTimeout(() => setNotifSaved(false), 3000)
    } catch {
      const queuedCount = enqueueNotificationPrefsMutation({
        notifLeadCaptured: notifPrefs.leadCaptured,
        notifWeeklyDigest: notifPrefs.weeklyDigest,
        notifProductUpdates: notifPrefs.productUpdates,
      })
      try {
        localStorage.setItem('dotly:notification_prefs', JSON.stringify(notifPrefs))
      } catch {
        /* ignore */
      }
      setNotifSavedMessage(
        `Saved locally while offline. ${queuedCount} queued change${queuedCount === 1 ? '' : 's'} will retry automatically.`,
      )
      setNotifSaved(true)
      setTimeout(() => setNotifSaved(false), 4000)
      setNotifError(null)
    } finally {
      setNotifSaving(false)
    }
  }, [notifPrefs])

  const handleResendVerification = useCallback(async () => {
    setVerifyEmailLoading(true)
    setVerifyEmailStatus(null)
    try {
      await apiPost('/auth/resend-verification', { email })
      setVerifyEmailStatus('Verification email sent. Check your inbox.')
    } catch (error) {
      setVerifyEmailStatus(
        error instanceof Error ? error.message : 'Could not resend verification email.',
      )
    } finally {
      setVerifyEmailLoading(false)
    }
  }, [email])

  const handleChangePassword = useCallback(async () => {
    setPasswordStatus(null)
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus('Fill in all password fields.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordStatus('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus('New password and confirmation do not match.')
      return
    }

    setPasswordSaving(true)
    try {
      const response = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? 'Could not update password.')
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordStatus('Password updated. Please sign in again on other devices if needed.')
    } catch (error) {
      setPasswordStatus(error instanceof Error ? error.message : 'Could not update password.')
    } finally {
      setPasswordSaving(false)
    }
  }, [confirmPassword, currentPassword, newPassword])

  const handleRequestEmailChange = useCallback(async () => {
    setEmailChangeStatus(null)
    const nextEmail = pendingEmail.trim().toLowerCase()
    if (!nextEmail) {
      setEmailChangeStatus('Enter your new email address.')
      return
    }
    if (!currentPassword) {
      setEmailChangeStatus('Enter your current password to continue.')
      return
    }

    setEmailChangeSaving(true)
    try {
      const response = await fetch('/api/users/me/email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ newEmail: nextEmail, currentPassword }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? 'Could not start email change.')
      }
      setEmailChangeStatus('Check your new email inbox to confirm the change.')
    } catch (error) {
      setEmailChangeStatus(error instanceof Error ? error.message : 'Could not start email change.')
    } finally {
      setEmailChangeSaving(false)
    }
  }, [currentPassword, pendingEmail])

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

      <SettingsTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        onOpenBilling={() => router.push('/settings/billing')}
      />

      <div className="app-panel rounded-[28px] p-6 sm:p-7">
        {activeTab === 'Profile' && (
          <ProfileTabContent
            profileLoading={profileLoading}
            name={name}
            email={email}
            emailVerified={emailVerified}
            verifyEmailStatus={verifyEmailStatus}
            passwordStatus={passwordStatus}
            emailChangeStatus={emailChangeStatus}
            currentPassword={currentPassword}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            pendingEmail={pendingEmail}
            country={country}
            timezone={timezone}
            profileFieldErrors={profileFieldErrors}
            profileStatus={profileStatus}
            profileLoadError={profileLoadError}
            profileSaving={profileSaving}
            verifyEmailLoading={verifyEmailLoading}
            passwordSaving={passwordSaving}
            emailChangeSaving={emailChangeSaving}
            onNameChange={(value) => {
              setName(value)
              setProfileFieldErrors((prev) => ({ ...prev, name: undefined }))
            }}
            onCurrentPasswordChange={setCurrentPassword}
            onNewPasswordChange={setNewPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onPendingEmailChange={setPendingEmail}
            onCountryChange={(value) => {
              setCountry(value)
              setProfileFieldErrors((prev) => ({ ...prev, country: undefined }))
            }}
            onTimezoneChange={(value) => {
              setTimezone(value)
              setProfileFieldErrors((prev) => ({ ...prev, timezone: undefined }))
            }}
            onResendVerification={() => void handleResendVerification()}
            onChangePassword={() => void handleChangePassword()}
            onRequestEmailChange={() => void handleRequestEmailChange()}
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
            notifSavedMessage={notifSavedMessage}
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
