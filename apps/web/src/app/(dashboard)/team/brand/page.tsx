'use client'

import type { JSX } from 'react'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Palette } from 'lucide-react'
import { FeatureGateCard } from '@/components/billing/FeatureGateCard'
import { useBillingPlan } from '@/components/billing/BillingPlanProvider'
import { SelectField } from '@/components/ui/SelectField'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiPut, isApiError } from '@/lib/api'
import { hasPlanAccess } from '@/lib/billing-plans'

const FONT_OPTIONS = ['Inter', 'Roboto', 'Playfair Display', 'Lato', 'Montserrat', 'Space Grotesk']

interface BrandConfig {
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  brandLock: boolean
  hideDotlyBranding: boolean
}

export default function TeamBrandPage(): JSX.Element {
  const { plan, loading: planLoading } = useBillingPlan()
  // teamId is fetched on mount from the user's first team
  const [teamId, setTeamId] = useState<string>('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [brand, setBrand] = useState<BrandConfig>({
    logoUrl: '',
    primaryColor: '#0ea5e9',
    secondaryColor: '#ffffff',
    fontFamily: 'Inter',
    brandLock: false,
    hideDotlyBranding: false,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Fetch the user's team on mount so we have a teamId to save against
  useEffect(() => {
    if (planLoading || !hasPlanAccess(plan, 'BUSINESS')) return

    async function loadTeam() {
      try {
        const token = await getAccessToken()
        if (!token) return
        const team = await apiGet<{
          id: string
          brandLock?: boolean
          brandConfig?: Record<string, unknown>
        } | null>('/teams/mine', token)
        if (!team) return
        setTeamId(team.id)
        const cfg = team.brandConfig ?? {}
        setBrand((prev) => ({
          ...prev,
          logoUrl: (cfg['logoUrl'] as string | undefined) ?? prev.logoUrl,
          primaryColor: (cfg['primaryColor'] as string | undefined) ?? prev.primaryColor,
          secondaryColor: (cfg['secondaryColor'] as string | undefined) ?? prev.secondaryColor,
          fontFamily: (cfg['fontFamily'] as string | undefined) ?? prev.fontFamily,
          brandLock: team.brandLock ?? prev.brandLock,
          hideDotlyBranding:
            (cfg['hideDotlyBranding'] as boolean | undefined) ?? prev.hideDotlyBranding,
        }))
      } catch (err) {
        if (isApiError(err) && (err.statusCode === 403 || err.statusCode === 401)) {
          setPermissionDenied(true)
          setLoadError('You do not have permission to manage team branding.')
          return
        }
        setLoadError('Could not load team settings.')
      }
    }
    void loadTeam()
  }, [plan, planLoading])

  const [saveError, setSaveError] = useState<string | null>(null)

  if (planLoading) {
    return <div className="h-40 animate-pulse rounded-3xl bg-white/70" />
  }

  if (!hasPlanAccess(plan, 'BUSINESS')) {
    return (
      <FeatureGateCard
        eyebrow="Coming later"
        title="Shared team branding is coming later"
        description="Centralized team brand controls will launch with future Business plans. Current published plans focus on individual cards and personal workflows."
        ctaLabel="View current pricing"
        ctaHref="/pricing"
      />
    )
  }

  if (permissionDenied) {
    return (
      <FeatureGateCard
        eyebrow="Admins only"
        title="Only team admins can change branding"
        description="Ask a team admin to update shared branding for this workspace."
        ctaLabel="Back to team"
        ctaHref="/team"
      />
    )
  }

  const handleSave = async () => {
    if (!teamId) return
    setSaving(true)
    setSaveError(null)
    try {
      const token = await getAccessToken()
      await apiPut(
        `/teams/${teamId}`,
        {
          brandConfig: {
            logoUrl: brand.logoUrl,
            primaryColor: brand.primaryColor,
            secondaryColor: brand.secondaryColor,
            fontFamily: brand.fontFamily,
            hideDotlyBranding: brand.hideDotlyBranding,
          },
          brandLock: brand.brandLock,
        },
        token ?? undefined,
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      if (isApiError(err) && (err.statusCode === 403 || err.statusCode === 401)) {
        setPermissionDenied(true)
        setSaveError('Only team admins can change team branding.')
        return
      }
      setSaveError('Failed to save brand settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="app-panel rounded-[30px] px-6 py-6 sm:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600">
            <Palette className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500/80">
              Team Identity
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Brand Settings</h1>
            <p className="mt-2 text-sm text-gray-500">
              Configure the shared brand system your public team cards use when brand lock is
              enabled.
            </p>
          </div>
        </div>
      </div>

      {permissionDenied && (
        <StatusNotice
          tone="warning"
          message="Team branding is admin-only. Ask a team admin to make these changes."
        />
      )}

      {loadError && <StatusNotice message={loadError} />}

      {saveError && <StatusNotice message={saveError} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Brand config form */}
        <div className="app-panel rounded-[28px] p-6 space-y-5">
          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input
              type="url"
              value={brand.logoUrl}
              onChange={(e) => setBrand({ ...brand, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Primary color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brand.primaryColor}
                onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded border border-gray-200"
              />
              <input
                type="text"
                value={brand.primaryColor}
                onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brand.secondaryColor}
                onChange={(e) => setBrand({ ...brand, secondaryColor: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded border border-gray-200"
              />
              <input
                type="text"
                value={brand.secondaryColor}
                onChange={(e) => setBrand({ ...brand, secondaryColor: e.target.value })}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
            <SelectField
              value={brand.fontFamily}
              onChange={(e) => setBrand({ ...brand, fontFamily: e.target.value })}
              className="focus:border-brand-500 focus:ring-brand-100"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">Brand Lock</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Force team public cards to use this logo, colors, and font instead of per-card
                  theme settings.
                </p>
              </div>
              <button
                onClick={() => setBrand({ ...brand, brandLock: !brand.brandLock })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  brand.brandLock ? 'bg-brand-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    brand.brandLock ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Team logo above the card and the Dotly footer preference apply independently; brand
              lock controls in-card theme enforcement.
            </p>
          </div>

          {/* Hide Dotly Branding */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  Hide &quot;Powered by Dotly&quot;
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Remove the Dotly footer on public card pages using team branding.
                </p>
              </div>
              <button
                onClick={() => setBrand({ ...brand, hideDotlyBranding: !brand.hideDotlyBranding })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  brand.hideDotlyBranding ? 'bg-brand-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    brand.hideDotlyBranding ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !teamId}
            className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {saving
              ? 'Saving...'
              : saved
                ? 'Saved!'
                : !teamId
                  ? 'Unavailable — team failed to load'
                  : 'Save Brand Settings'}
          </button>
        </div>

        {/* Live preview */}
        <div className="app-panel rounded-[28px] p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Live Preview</h3>
          <div
            className="rounded-xl p-6 shadow-md"
            style={{
              backgroundColor: brand.primaryColor,
              fontFamily: brand.fontFamily,
            }}
          >
            {brand.logoUrl ? (
              <Image
                src={brand.logoUrl}
                alt="Team logo"
                width={48}
                height={48}
                unoptimized
                className="h-12 w-auto mb-4 rounded"
              />
            ) : (
              <div
                className="h-12 w-24 rounded mb-4 flex items-center justify-center"
                style={{ backgroundColor: brand.secondaryColor }}
              >
                <span className="text-xs font-bold" style={{ color: brand.primaryColor }}>
                  Logo
                </span>
              </div>
            )}
            <h4 className="text-xl font-bold" style={{ color: brand.secondaryColor }}>
              Your Name
            </h4>
            <p className="text-sm mt-1 opacity-80" style={{ color: brand.secondaryColor }}>
              Your Title · Company
            </p>
            <div
              className="mt-4 rounded-lg px-4 py-2 text-center text-sm font-semibold"
              style={{
                backgroundColor: brand.secondaryColor,
                color: brand.primaryColor,
              }}
            >
              Connect with me
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Preview of the team theme used on public cards when brand lock is enabled.
          </p>
        </div>
      </div>
    </div>
  )
}
