'use client'

import type { JSX } from 'react'
import { useState, useEffect } from 'react'

import { FeatureGateCard } from '@/components/billing/FeatureGateCard'
import { useBillingPlan } from '@/components/billing/BillingPlanProvider'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { apiGet, apiPut, isApiError } from '@/lib/api'
import { hasPlanAccess } from '@/lib/billing-plans'
import { getAccessToken } from '@/lib/supabase/client'

import { BrandConfigForm, BrandPreview, TeamBrandHero } from './components'
import { DEFAULT_BRAND_CONFIG, mergeBrandConfig } from './helpers'
import type { BrandConfig } from './types'

export default function TeamBrandPage(): JSX.Element {
  const { plan, loading: planLoading } = useBillingPlan()
  const [teamId, setTeamId] = useState<string>('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_BRAND_CONFIG)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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
        setBrand((prev) => mergeBrandConfig(prev, team))
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

  return (
    <div className="space-y-6">
      <TeamBrandHero />

      {permissionDenied && (
        <StatusNotice
          tone="warning"
          message="Team branding is admin-only. Ask a team admin to make these changes."
        />
      )}

      {loadError && <StatusNotice message={loadError} />}
      {saveError && <StatusNotice message={saveError} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BrandConfigForm
          brand={brand}
          teamId={teamId}
          saving={saving}
          saved={saved}
          onChange={setBrand}
          onToggleBrandLock={() => setBrand((prev) => ({ ...prev, brandLock: !prev.brandLock }))}
          onToggleHideBranding={() =>
            setBrand((prev) => ({ ...prev, hideDotlyBranding: !prev.hideDotlyBranding }))
          }
          onSave={() => {
            void handleSave()
          }}
        />

        <BrandPreview brand={brand} />
      </div>
    </div>
  )
}
