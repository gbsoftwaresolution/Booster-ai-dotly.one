'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { FormEvent, JSX } from 'react'

import { FeatureGateCard } from '@/components/billing/FeatureGateCard'
import { useBillingPlan } from '@/components/billing/BillingPlanProvider'
import { apiDelete, apiGet, apiPatch, apiPost, isApiError } from '@/lib/api'
import { hasPlanAccess } from '@/lib/billing-plans'
import { getAccessToken } from '@/lib/supabase/client'
import type { ItemsResponse } from '@dotly/types'

import {
  AddDomainForm,
  DomainsAlerts,
  DomainsConfirmDialog,
  DomainsHero,
  DomainsList,
} from './components'
import { getDomainStats, getFocusMessage, normalizeDomainInput, validateDomain } from './helpers'
import type { CardOption, ConfirmDialogState, CustomDomain } from './types'

export default function DomainsPage(): JSX.Element {
  const { plan, loading: planLoading } = useBillingPlan()
  const fetchDomainsRequestIdRef = useRef(0)
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [cards, setCards] = useState<CardOption[]>([])
  const [cardsLoaded, setCardsLoaded] = useState(false)
  const [cardsLoading, setCardsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [adding, setAdding] = useState(false)
  const [domainInput, setDomainInput] = useState('')
  const [error, setError] = useState('')
  const [domainFieldError, setDomainFieldError] = useState('')
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)

  const fetchDomains = useCallback(async () => {
    const requestId = ++fetchDomainsRequestIdRef.current
    setPermissionDenied(false)

    try {
      const token = await getAccessToken()
      const data = await apiGet<ItemsResponse<CustomDomain>>('/custom-domains', token ?? undefined)

      if (fetchDomainsRequestIdRef.current !== requestId) return

      setDomains(data.items)
      setHasLoadedOnce(true)
    } catch (err) {
      if (fetchDomainsRequestIdRef.current !== requestId) return

      if (isApiError(err) && (err.statusCode === 403 || err.statusCode === 401)) {
        setPermissionDenied(true)
        setError('You do not have permission to manage custom domains.')
      } else {
        setError('Failed to load domains.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (planLoading || !hasPlanAccess(plan, 'PRO')) return
    void fetchDomains()
  }, [fetchDomains, plan, planLoading])

  const loadCards = useCallback(async () => {
    if (cardsLoaded || cardsLoading) return

    setCardsLoading(true)
    try {
      const token = await getAccessToken()
      const data = await apiGet<ItemsResponse<CardOption>>('/cards', token ?? undefined)
      setCards(data.items)
      setCardsLoaded(true)
    } catch (err) {
      if (isApiError(err) && (err.statusCode === 403 || err.statusCode === 401)) {
        setPermissionDenied(true)
      } else {
        setError('Failed to load cards for assignment.')
      }
    } finally {
      setCardsLoading(false)
    }
  }, [cardsLoaded, cardsLoading])

  async function handleAddDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (adding) return

    const normalizedDomain = normalizeDomainInput(domainInput)
    const validationError = validateDomain(normalizedDomain)

    if (validationError) {
      setDomainFieldError(validationError)
      return
    }

    setAdding(true)
    setError('')
    setDomainFieldError('')

    try {
      const token = await getAccessToken()
      await apiPost('/custom-domains', { domain: normalizedDomain }, token ?? undefined)
      setDomainInput('')
      await fetchDomains()
    } catch {
      setError('Failed to add domain. Make sure it is a valid hostname and not already registered.')
    } finally {
      setAdding(false)
    }
  }

  async function handleVerify(domainId: string) {
    if (verifyingId || assigningId || deletingId) return

    setVerifyingId(domainId)
    setError('')

    try {
      const token = await getAccessToken()
      await apiPost(`/custom-domains/${domainId}/verify`, {}, token ?? undefined)
      await fetchDomains()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed. Check TXT record.'
      setError(message)
    } finally {
      setVerifyingId(null)
    }
  }

  async function handleAssignCard(domainId: string, cardId: string | null) {
    if (verifyingId || assigningId || deletingId) return

    setAssigningId(domainId)
    setError('')

    try {
      const token = await getAccessToken()
      await apiPatch(`/custom-domains/${domainId}`, { cardId }, token ?? undefined)
      await fetchDomains()
    } catch {
      setError('Failed to assign card to domain.')
    } finally {
      setAssigningId(null)
    }
  }

  async function handleDelete(domainId: string) {
    if (verifyingId || assigningId || deletingId) return

    setDeletingId(domainId)
    setError('')
    setDomainFieldError('')

    try {
      const token = await getAccessToken()
      await apiDelete(`/custom-domains/${domainId}`, token ?? undefined)
      setDomains((prev) => prev.filter((domain) => domain.id !== domainId))
    } catch {
      setError('Failed to delete domain.')
    } finally {
      setDeletingId(null)
    }
  }

  function confirmDelete(domainId: string) {
    const domain = domains.find((item) => item.id === domainId)
    if (!domain) return
    setConfirmDialog({ domainId, domain: domain.domain })
  }

  const { activeDomains, assignedDomains, pendingDomains } = getDomainStats(domains)
  const focusMessage = getFocusMessage({ loading, domains, activeDomains })

  if (planLoading) {
    return <div className="h-40 animate-pulse rounded-3xl bg-white/70" />
  }

  if (!hasPlanAccess(plan, 'PRO')) {
    return (
      <FeatureGateCard
        eyebrow="Pro feature"
        title="Custom domains require Pro"
        description="Connect your own domain to a card on the Pro plan. Free and Starter keep the standard Dotly card link."
        ctaLabel="Upgrade to Pro"
        ctaHref="/settings/billing"
      />
    )
  }

  return (
    <div className="space-y-6">
      <DomainsHero
        loading={loading}
        domainsCount={domains.length}
        activeDomains={activeDomains}
        assignedDomains={assignedDomains}
        pendingDomains={pendingDomains}
        focusMessage={focusMessage}
      />

      <AddDomainForm
        domainInput={domainInput}
        domainFieldError={domainFieldError}
        adding={adding}
        onChange={(value) => {
          setDomainInput(value)
          if (domainFieldError) setDomainFieldError('')
        }}
        onSubmit={(event) => {
          void handleAddDomain(event)
        }}
      />

      <DomainsAlerts permissionDenied={permissionDenied} error={error} />

      <DomainsList
        loading={loading}
        error={error}
        hasLoadedOnce={hasLoadedOnce}
        domains={domains}
        cards={cards}
        cardsLoaded={cardsLoaded}
        cardsLoading={cardsLoading}
        verifyingId={verifyingId}
        deletingId={deletingId}
        assigningId={assigningId}
        onRetry={() => {
          void fetchDomains()
        }}
        onLoadCards={() => {
          void loadCards()
        }}
        onAssignCard={(domainId, cardId) => {
          void handleAssignCard(domainId, cardId)
        }}
        onVerify={(domainId) => {
          void handleVerify(domainId)
        }}
        onDelete={confirmDelete}
      />

      {confirmDialog && (
        <DomainsConfirmDialog
          title="Remove domain"
          message={`Remove domain "${confirmDialog.domain}"? This cannot be undone.`}
          onConfirm={() => {
            const domainId = confirmDialog.domainId
            setConfirmDialog(null)
            void handleDelete(domainId)
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  )
}
