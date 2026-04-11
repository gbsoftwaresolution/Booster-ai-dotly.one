'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { JSX } from 'react'
import { AlertTriangle, Globe, Plus } from 'lucide-react'
import { FeatureGateCard } from '@/components/billing/FeatureGateCard'
import { useBillingPlan } from '@/components/billing/BillingPlanProvider'
import { SelectField } from '@/components/ui/SelectField'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { apiGet, apiPost, apiDelete, apiPatch, isApiError } from '@/lib/api'
import { hasPlanAccess } from '@/lib/billing-plans'
import { getAccessToken } from '@/lib/supabase/client'

interface CustomDomain {
  id: string
  domain: string
  status: 'PENDING' | 'ACTIVE' | 'FAILED'
  verificationToken: string
  isVerified: boolean
  sslStatus: string
  createdAt: string
  card?: {
    id: string
    handle: string
  } | null
}

interface CardOption {
  id: string
  handle: string
  fields?: { name?: string } | null
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
}

const DOMAIN_REGEX = /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

export default function DomainsPage(): JSX.Element {
  const { plan, loading: planLoading } = useBillingPlan()
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [cards, setCards] = useState<CardOption[]>([])
  const [loading, setLoading] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [adding, setAdding] = useState(false)
  const [domainInput, setDomainInput] = useState('')
  const [error, setError] = useState('')
  const [domainFieldError, setDomainFieldError] = useState('')
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    domainId: string
    domain: string
  } | null>(null)

  const fetchDomains = useCallback(async () => {
    try {
      const token = await getAccessToken()
      const data = await apiGet<CustomDomain[]>('/custom-domains', token ?? undefined)
      setDomains(data)
    } catch (err) {
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
    // Load user cards for the assign-to-card selector
    void (async () => {
      try {
        const token = await getAccessToken()
        const data = await apiGet<CardOption[]>('/cards', token ?? undefined)
        setCards(data)
      } catch (err) {
        if (isApiError(err) && (err.statusCode === 403 || err.statusCode === 401)) {
          setPermissionDenied(true)
        }
        // non-fatal — card selector will just be empty
      }
    })()
  }, [fetchDomains, plan, planLoading])

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

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault()
    if (adding) return
    const normalizedDomain = domainInput
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
    if (!normalizedDomain) {
      setDomainFieldError('Domain is required.')
      return
    }
    if (!DOMAIN_REGEX.test(normalizedDomain)) {
      setDomainFieldError('Enter a valid hostname like card.yourcompany.com.')
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
    setVerifyingId(domainId)
    setError('')
    try {
      const token = await getAccessToken()
      await apiPost(`/custom-domains/${domainId}/verify`, {}, token ?? undefined)
      await fetchDomains()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed. Check TXT record.'
      setError(msg)
    } finally {
      setVerifyingId(null)
    }
  }

  async function handleAssignCard(domainId: string, cardId: string | null) {
    setAssigningId(domainId)
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
    setDeletingId(domainId)
    setError('')
    try {
      const token = await getAccessToken()
      await apiDelete(`/custom-domains/${domainId}`, token ?? undefined)
      setDomains((prev) => prev.filter((d) => d.id !== domainId))
    } catch {
      setError('Failed to delete domain.')
    } finally {
      setDeletingId(null)
    }
  }

  async function confirmDelete(domainId: string) {
    const domain = domains.find((d) => d.id === domainId)
    if (!domain) return
    setConfirmDialog({ domainId, domain: domain.domain })
  }

  const activeDomains = domains.filter((domain) => domain.status === 'ACTIVE').length
  const assignedDomains = domains.filter((domain) => Boolean(domain.card)).length
  const focusMessage = loading
    ? 'Loading your custom domain inventory.'
    : domains.length === 0
      ? 'Add your first domain to begin verification and card routing.'
      : activeDomains > 0
        ? `${activeDomains} domain${activeDomains === 1 ? '' : 's'} are active and ready to serve branded links.`
        : 'Verification is still pending. Complete DNS steps to activate your branded domains.'

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
              <Globe className="h-3.5 w-3.5" />
              Pro Feature
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-[2rem]">
              Connect branded domains with more confidence
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-[15px]">
              Verify ownership, assign domains to cards, and keep your branded routing setup visible
              from one place.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">
              {[
                { label: 'Domains', value: loading ? '—' : domains.length },
                { label: 'Active', value: loading ? '—' : activeDomains },
                { label: 'Assigned', value: loading ? '—' : assignedDomains },
                { label: 'Cards', value: loading ? '—' : cards.length },
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
                <Globe className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">Focus: {focusMessage}</span>
            </div>
          </div>

          <div className="app-panel-subtle rounded-[30px] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Domain Snapshot
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  Brand routing health at a glance
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-600 shadow-sm">
                Live
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                {
                  label: 'Activation state',
                  value: loading ? '—' : `${activeDomains}`,
                  detail:
                    activeDomains > 0
                      ? 'Domains already serving branded traffic'
                      : 'No active domain is serving yet',
                  tone:
                    activeDomains > 0
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-amber-50 text-amber-600',
                },
                {
                  label: 'Assignment coverage',
                  value: loading ? '—' : `${assignedDomains}`,
                  detail:
                    assignedDomains > 0
                      ? 'Domains linked directly to cards'
                      : 'Assign a card to route traffic properly',
                  tone: 'bg-indigo-50 text-indigo-600',
                },
                {
                  label: 'DNS target',
                  value: 'cname.dotly.one',
                  detail: 'Use this CNAME after TXT ownership verification',
                  tone: 'bg-sky-50 text-sky-600',
                },
              ].map(({ label, value, detail, tone }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/80 px-4 py-3"
                >
                  <span
                    className={`${tone} flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl`}
                  >
                    <Globe className="h-4.5 w-4.5" />
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

      {/* Add domain form */}
      <div className="app-panel rounded-[28px] p-6 sm:p-7">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Add a Domain</h2>
        <form
          onSubmit={(e) => {
            void handleAddDomain(e)
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={domainInput}
            onChange={(e) => {
              setDomainInput(e.target.value)
              if (domainFieldError) setDomainFieldError('')
            }}
            placeholder="card.yourcompany.com"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={domainFieldError ? 'true' : 'false'}
            aria-describedby={domainFieldError ? 'domain-input-error' : 'domain-input-help'}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${domainFieldError ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300'}`}
          />
          <button
            type="submit"
            disabled={adding || !domainInput.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            {adding ? 'Adding...' : 'Add Domain'}
          </button>
        </form>
        <div className="mt-2 min-h-5 text-xs">
          {domainFieldError ? (
            <p id="domain-input-error" className="text-red-600">
              {domainFieldError}
            </p>
          ) : (
            <p id="domain-input-help" className="text-gray-400">
              Enter the hostname only, without `http://` or path segments.
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {permissionDenied && (
        <StatusNotice
          tone="warning"
          message="Custom domain management is not available for your current account access."
        />
      )}
      {error && <StatusNotice message={error} />}

      {/* Domain list */}
      {loading ? (
        <div className="app-list-skeleton rounded-[28px] text-sm text-gray-500">
          Loading domains...
        </div>
      ) : domains.length === 0 ? (
        <div className="app-empty-state">
          <Globe className="mb-4 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-gray-600">No custom domains yet.</p>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            Add a domain above to start verification and connect it to one of your cards.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <div key={domain.id} className="app-panel rounded-[28px] p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* Domain + status */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {domain.domain}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[domain.status] ?? ''}`}
                    >
                      {domain.status}
                    </span>
                    {domain.card && (
                      <span className="text-xs text-gray-400">
                        Assigned to /{domain.card.handle}
                      </span>
                    )}
                  </div>

                  {/* Assign to card */}
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-500 shrink-0">
                      Assign to card:
                    </label>
                    <SelectField
                      value={domain.card?.id ?? ''}
                      disabled={assigningId === domain.id}
                      onChange={(e) => {
                        void handleAssignCard(domain.id, e.target.value || null)
                      }}
                      className="flex-1 rounded-xl border-gray-300/80 bg-white/85 px-3 py-2.5 pr-9 text-xs focus:border-brand-500 focus:ring-brand-100"
                    >
                      <option value="">— None —</option>
                      {cards.map((c) => (
                        <option key={c.id} value={c.id}>
                          /{c.handle}
                          {c.fields?.name ? ` (${c.fields.name})` : ''}
                        </option>
                      ))}
                    </SelectField>
                    {assigningId === domain.id && (
                      <span className="text-xs text-gray-400">Saving…</span>
                    )}
                  </div>

                  {/* TXT verification record */}
                  {domain.status !== 'ACTIVE' && (
                    <div className="app-panel-subtle mt-4 rounded-[22px] p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        DNS Verification Record
                      </p>
                      <div className="space-y-1 font-mono text-xs text-gray-700">
                        <div>
                          <span className="text-gray-400">Type:</span> TXT
                        </div>
                        <div>
                          <span className="text-gray-400">Name:</span>{' '}
                          <span className="select-all">_dotly-verify.{domain.domain}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Value:</span>{' '}
                          <span className="select-all break-all">{domain.verificationToken}</span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        After adding the record, DNS propagation may take up to 24 hours.
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-wrap gap-2">
                  {domain.status !== 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => {
                        void handleVerify(domain.id)
                      }}
                      disabled={verifyingId === domain.id}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                    >
                      {verifyingId === domain.id ? 'Checking...' : 'Verify'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      void confirmDelete(domain.id)
                    }}
                    disabled={deletingId === domain.id}
                    className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === domain.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm remove dialog */}
      {confirmDialog && (
        <ConfirmDialog
          message={`Remove domain "${confirmDialog.domain}"? This cannot be undone.`}
          onConfirm={() => {
            const id = confirmDialog.domainId
            setConfirmDialog(null)
            void handleDelete(id)
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  )
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement | null
    cancelButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'),
      )
      if (focusableElements.length === 0) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousActiveElementRef.current?.focus()
    }
  }, [onCancel])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="domains-confirm-dialog-title"
        className="app-panel fixed inset-x-4 top-1/2 z-50 w-full max-w-sm -translate-y-1/2 rounded-[28px] p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 id="domains-confirm-dialog-title" className="text-sm font-semibold text-gray-900">
              Confirm removal
            </h3>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Remove
          </button>
        </div>
      </div>
    </>
  )
}
