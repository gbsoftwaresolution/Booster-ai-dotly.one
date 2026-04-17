'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { RadioTower, Plus, Trash2 } from 'lucide-react'
import { FeatureGateCard } from '@/components/billing/FeatureGateCard'
import { useBillingPlan } from '@/components/billing/BillingPlanProvider'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { apiGet, apiPost, apiPut, apiDelete, isApiError } from '@/lib/api'
import { hasPlanAccess } from '@/lib/billing-plans'
import { getAccessToken } from '@/lib/auth/client'
import type { ItemsResponse } from '@dotly/types'
import { ConfirmDialog, CreateModal, EndpointCard } from './components'
import { ALL_EVENTS } from './helpers'
import type { WebhookEndpoint, WebhookTestResult } from './types'

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WebhooksPage(): JSX.Element {
  const { plan, loading: planLoading } = useBillingPlan()
  const loadRequestIdRef = useRef(0)
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [busyEndpointId, setBusyEndpointId] = useState<string | null>(null)
  const [confirmDeleteEndpoint, setConfirmDeleteEndpoint] = useState<WebhookEndpoint | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const enabledCount = endpoints.filter((endpoint) => endpoint.enabled).length
  const focusMessage = loading
    ? 'Loading webhook endpoints and delivery tooling.'
    : endpoints.length === 0
      ? 'Add your first endpoint to start receiving real-time events.'
      : `${enabledCount} endpoint${enabledCount === 1 ? '' : 's'} are enabled and ready to receive Dotly events.`

  const load = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current
    setPermissionDenied(false)
    setPageError(null)
    try {
      const token = await getAccessToken()
      const data = await apiGet<ItemsResponse<WebhookEndpoint>>('/webhooks', token)
      if (loadRequestIdRef.current !== requestId) return
      setEndpoints(data.items)
      setHasLoadedOnce(true)
    } catch (e) {
      if (loadRequestIdRef.current !== requestId) return
      if (isApiError(e) && (e.statusCode === 403 || e.statusCode === 401)) {
        setPermissionDenied(true)
        setPageError('You do not have permission to manage webhooks.')
      } else {
        setPageError(e instanceof Error ? e.message : 'Failed to load webhooks.')
      }
    } finally {
      if (loadRequestIdRef.current !== requestId) return
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (planLoading || !hasPlanAccess(plan, 'PRO')) return
    void load()
  }, [load, plan, planLoading])

  if (planLoading) {
    return <div className="h-40 animate-pulse rounded-3xl bg-white/70" />
  }

  if (!hasPlanAccess(plan, 'PRO')) {
    return (
      <FeatureGateCard
        eyebrow="Pro feature"
        title="Webhooks require Pro"
        description="Real-time webhook delivery is available on Pro. Upgrade when you need server-to-server event automation."
        ctaLabel="Upgrade to Pro"
        ctaHref="/settings/billing"
      />
    )
  }

  async function handleToggle(id: string, enabled: boolean) {
    if (busyEndpointId) return
    setBusyEndpointId(id)
    setPageError(null)
    try {
      const token = await getAccessToken()
      const updated = await apiPut<WebhookEndpoint>(`/webhooks/${id}`, { enabled }, token)
      setEndpoints((prev) => prev.map((ep) => (ep.id === id ? updated : ep)))
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed to toggle webhook.')
    } finally {
      setBusyEndpointId((current) => (current === id ? null : current))
    }
  }

  async function handleDelete(id: string) {
    if (busyEndpointId) return
    setBusyEndpointId(id)
    setPageError(null)
    try {
      const token = await getAccessToken()
      await apiDelete(`/webhooks/${id}`, token)
      setEndpoints((prev) => prev.filter((ep) => ep.id !== id))
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed to delete webhook.')
    } finally {
      setBusyEndpointId((current) => (current === id ? null : current))
    }
  }

  async function handleRegenerateSecret(id: string) {
    if (busyEndpointId) return
    setBusyEndpointId(id)
    setPageError(null)
    try {
      const token = await getAccessToken()
      const updated = await apiPost<WebhookEndpoint>(`/webhooks/${id}/secret`, {}, token)
      setEndpoints((prev) => prev.map((ep) => (ep.id === id ? updated : ep)))
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed to regenerate webhook secret.')
    } finally {
      setBusyEndpointId((current) => (current === id ? null : current))
    }
  }

  async function handleTestFire(id: string) {
    if (busyEndpointId) throw new Error('Another webhook action is already in progress.')
    setBusyEndpointId(id)
    setPageError(null)
    try {
      const token = await getAccessToken()
      return await apiPost<WebhookTestResult>(`/webhooks/${id}/test`, {}, token)
    } finally {
      setBusyEndpointId((current) => (current === id ? null : current))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:py-8">
      {/* Error banner */}
      {permissionDenied ? (
        <StatusNotice tone="warning" message="You do not have permission to manage webhooks." />
      ) : pageError ? (
        <StatusNotice
          message={pageError}
          action={
            <button type="button" onClick={() => void load()} className="font-semibold underline">
              Retry
            </button>
          }
        />
      ) : null}
      {/* Header */}
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
              <RadioTower className="h-3.5 w-3.5" />
              Developer Tools
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-[2rem]">
              Manage event delivery with more confidence
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-[15px]">
              Control endpoint activation, test event delivery, and keep server-to-server
              automations visible in one place.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">
              {[
                { label: 'Endpoints', value: loading ? '—' : endpoints.length },
                { label: 'Enabled', value: loading ? '—' : enabledCount },
                { label: 'Disabled', value: loading ? '—' : endpoints.length - enabledCount },
                { label: 'Events', value: ALL_EVENTS.length },
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

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-28px_rgba(14,165,233,0.42)] transition-transform hover:-translate-y-0.5 hover:bg-brand-600"
              >
                <Plus className="h-4 w-4" />
                Add endpoint
              </button>
            </div>

            <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <RadioTower className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">Focus: {focusMessage}</span>
            </div>
          </div>

          <div className="app-panel-subtle rounded-[30px] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Delivery Snapshot
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  Automation health at a glance
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-600 shadow-sm">
                Live
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                {
                  label: 'Enabled delivery',
                  value: loading ? '—' : `${enabledCount}`,
                  detail:
                    enabledCount > 0
                      ? 'Endpoints currently accepting event traffic'
                      : 'No active endpoint is enabled yet',
                  tone:
                    enabledCount > 0
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-amber-50 text-amber-600',
                },
                {
                  label: 'Endpoint coverage',
                  value: loading ? '—' : `${endpoints.length}`,
                  detail:
                    endpoints.length > 0
                      ? 'Server destinations configured for automation'
                      : 'No webhook destination configured',
                  tone: 'bg-indigo-50 text-indigo-600',
                },
                {
                  label: 'Security model',
                  value: 'HMAC',
                  detail: 'Requests include X-Dotly-Sig-256 for signature verification',
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
                    <RadioTower className="h-4.5 w-4.5" />
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

      {/* Info strip */}
      <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        <p className="font-semibold">HMAC-SHA256 verification</p>
        <p className="mt-0.5 text-xs text-sky-700">
          Every request includes an{' '}
          <code className="rounded bg-sky-100 px-1 py-0.5 font-mono text-[11px]">
            X-Dotly-Sig-256
          </code>{' '}
          header. Verify it against your signing secret to ensure authenticity.
        </p>
      </div>

      {/* Endpoint list */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : pageError && !hasLoadedOnce ? (
        <div className="app-empty-state">
          <RadioTower className="mb-3 h-10 w-10 text-slate-300" />
          <p className="app-empty-state-title">Webhook endpoints are unavailable</p>
          <p className="app-empty-state-text">{pageError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : endpoints.length === 0 ? (
        <div className="app-empty-state">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="mb-3"
          >
            <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
            <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
            <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" />
          </svg>
          <p className="text-sm font-medium text-gray-500">No webhook endpoints yet</p>
          <p className="mt-1 text-xs text-gray-400">Add an endpoint to start receiving events.</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add first endpoint
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {endpoints.map((ep) => (
            <EndpointCard
              key={ep.id}
              endpoint={ep}
              onToggle={(enabled) => void handleToggle(ep.id, enabled)}
              onDelete={() => setConfirmDeleteEndpoint(ep)}
              onRegenerateSecret={() => handleRegenerateSecret(ep.id)}
              onTestFire={() => handleTestFire(ep.id)}
              busy={busyEndpointId !== null}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onCreated={(ep) => {
            setEndpoints((prev) => [ep, ...prev])
            setShowCreate(false)
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {confirmDeleteEndpoint ? (
        <ConfirmDialog
          title="Delete webhook endpoint?"
          message="Delete this webhook endpoint? All delivery logs will be removed."
          onCancel={() => setConfirmDeleteEndpoint(null)}
          onConfirm={() => {
            const endpointId = confirmDeleteEndpoint.id
            setConfirmDeleteEndpoint(null)
            void handleDelete(endpointId)
          }}
        />
      ) : null}
    </div>
  )
}
