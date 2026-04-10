'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback } from 'react'
import {
  RadioTower,
  Plus,
  Trash2,
  RefreshCw,
  Play,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  X,
} from 'lucide-react'
import { FeatureGateCard } from '@/components/billing/FeatureGateCard'
import { useBillingPlan } from '@/components/billing/BillingPlanProvider'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { cn } from '@/lib/cn'
import { apiGet, apiPost, apiPut, apiDelete, isApiError } from '@/lib/api'
import { hasPlanAccess } from '@/lib/billing-plans'
import { getAccessToken } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/tz'
import { useUserTimezone } from '@/hooks/useUserLocale'

// ── Types ─────────────────────────────────────────────────────────────────────

interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  secret?: string
  enabled: boolean
  createdAt: string
}

interface WebhookDelivery {
  id: string
  event: string
  statusCode: number | null
  success: boolean
  durationMs: number | null
  attemptNumber: number
  deliveredAt: string
}

interface WebhookTestResult {
  success: boolean
  statusCode: number | null
  durationMs: number
  responseBody: string
}

const ALL_EVENTS = [
  {
    value: 'lead.created',
    label: 'Lead created',
    description: 'A new lead captured from your card',
  },
  { value: 'card.viewed', label: 'Card viewed', description: 'Someone viewed your digital card' },
  { value: 'card.click', label: 'Card click', description: 'A link on your card was clicked' },
  {
    value: 'contact.stage_changed',
    label: 'Contact stage changed',
    description: 'A CRM contact moved to a new stage',
  },
  {
    value: 'contact.enriched',
    label: 'Contact enriched',
    description: 'A contact was automatically enriched',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function SecretDisplay({ secret }: { secret: string }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(secret).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 min-w-0 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-mono text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap">
        {revealed ? secret : '••••••••••••••••••••••••••••••••'}
      </code>
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className="shrink-0 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
      >
        {revealed ? 'Hide' : 'Show'}
      </button>
      <button
        type="button"
        onClick={() => void copy()}
        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        aria-label="Copy secret"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}

function SecretUnavailable() {
  return (
    <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
      Secret is only shown when created or regenerated. Regenerate it to reveal a new signing
      secret.
    </p>
  )
}

function StatusBadge({ success, code }: { success: boolean; code: number | null }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
        success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', success ? 'bg-green-500' : 'bg-red-500')} />
      {code ?? '—'}
    </span>
  )
}

function DeliveryLog({ endpointId }: { endpointId: string }) {
  const userTz = useUserTimezone()
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const token = await getAccessToken()
        const data = await apiGet<WebhookDelivery[]>(`/webhooks/${endpointId}/deliveries`, token)
        setDeliveries(data)
      } catch {
        //
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [endpointId])

  if (loading) {
    return <div className="py-4 text-center text-xs text-gray-400">Loading…</div>
  }

  if (deliveries.length === 0) {
    return <div className="py-4 text-center text-xs text-gray-400">No deliveries yet.</div>
  }

  return (
    <div className="divide-y divide-gray-100">
      {deliveries.map((d) => (
        <div key={d.id} className="flex items-center gap-3 py-2 px-1">
          <StatusBadge success={d.success} code={d.statusCode} />
          <span className="flex-1 min-w-0 text-xs text-gray-700 font-mono truncate">{d.event}</span>
          {d.durationMs !== null && (
            <span className="text-[10px] text-gray-400">{d.durationMs}ms</span>
          )}
          <span className="text-[10px] text-gray-300">{formatDateTime(d.deliveredAt, userTz)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Endpoint card ─────────────────────────────────────────────────────────────

function EndpointCard({
  endpoint,
  onToggle,
  onDelete,
  onRegenerateSecret,
  onTestFire,
}: {
  endpoint: WebhookEndpoint
  onToggle: (enabled: boolean) => void
  onDelete: () => void
  onRegenerateSecret: () => Promise<void>
  onTestFire: () => Promise<WebhookTestResult>
}) {
  const [expanded, setExpanded] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [testing, setTesting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'err' | null>(null)

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await onTestFire()
      if (!result.success) {
        throw new Error(
          result.responseBody || `Delivery failed with status ${result.statusCode ?? 'unknown'}`,
        )
      }
      setTestResult('ok')
    } catch {
      setTestResult('err')
    } finally {
      setTesting(false)
      setTimeout(() => setTestResult(null), 3000)
    }
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      await onRegenerateSecret()
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="app-panel overflow-hidden rounded-[24px]">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Enabled toggle */}
        <button
          type="button"
          onClick={() => onToggle(!endpoint.enabled)}
          className="shrink-0"
          aria-label={endpoint.enabled ? 'Disable' : 'Enable'}
        >
          <div className="relative h-5 w-9">
            <div
              className={cn(
                'h-5 w-9 rounded-full transition-colors duration-200',
                endpoint.enabled ? 'bg-brand-500' : 'bg-gray-200',
              )}
            />
            <div
              className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200',
                endpoint.enabled ? 'left-[18px]' : 'left-0.5',
              )}
            />
          </div>
        </button>

        {/* URL */}
        <span
          className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate"
          title={endpoint.url}
        >
          {endpoint.url}
        </span>

        {/* Event count badge */}
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
          {endpoint.events.length} event{endpoint.events.length !== 1 ? 's' : ''}
        </span>

        {/* Expand */}
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors shrink-0"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-4 flex flex-col gap-4">
          {/* Events */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Subscribed events
            </p>
            <div className="flex flex-wrap gap-1.5">
              {endpoint.events.map((ev) => (
                <span
                  key={ev}
                  className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-600"
                >
                  {ev}
                </span>
              ))}
            </div>
          </div>

          {/* Signing secret */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Signing secret
            </p>
            {endpoint.secret ? <SecretDisplay secret={endpoint.secret} /> : <SecretUnavailable />}
            <button
              type="button"
              onClick={() => void handleRegenerate()}
              disabled={regenerating}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3 w-3', regenerating && 'animate-spin')} />
              Regenerate secret
            </button>
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void handleTest()}
              disabled={testing}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-60',
                testResult === 'ok'
                  ? 'bg-green-100 text-green-700'
                  : testResult === 'err'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              <Play className="h-3 w-3" />
              {testing
                ? 'Firing…'
                : testResult === 'ok'
                  ? 'Sent!'
                  : testResult === 'err'
                    ? 'Failed'
                    : 'Test fire'}
            </button>

            <button
              type="button"
              onClick={() => setShowLog((x) => !x)}
              className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Delivery log
            </button>

            <button
              type="button"
              onClick={onDelete}
              className="ml-auto flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>

          {/* Delivery log */}
          {showLog && (
            <div className="app-panel-subtle rounded-[20px] px-3 py-2">
              <DeliveryLog endpointId={endpoint.id} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateModal({
  onCreated,
  onClose,
}: {
  onCreated: (ep: WebhookEndpoint) => void
  onClose: () => void
}) {
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleEvent(ev: string) {
    setSelectedEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]))
  }

  async function handleCreate() {
    if (!url.trim()) {
      setError('URL is required.')
      return
    }
    if (selectedEvents.length === 0) {
      setError('Select at least one event.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const token = await getAccessToken()
      const ep = await apiPost<WebhookEndpoint>(
        '/webhooks',
        { url: url.trim(), events: selectedEvents },
        token,
      )
      onCreated(ep)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create endpoint.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      style={{ backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl bg-white px-6 pb-10 pt-5 shadow-2xl"
        style={{ animation: 'slideUp 0.22s cubic-bezier(0.32, 0.72, 0, 1)' }}
      >
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-gray-200" />
        <h2 className="mb-4 text-lg font-bold text-gray-900">New webhook endpoint</h2>

        {/* URL */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Endpoint URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-server.com/webhooks/dotly"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
          />
        </div>

        {/* Events */}
        <div className="mb-5">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Events to send
          </label>
          <div className="flex flex-col gap-2">
            {ALL_EVENTS.map((ev) => (
              <label
                key={ev.value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 transition-colors hover:border-brand-300 hover:bg-brand-50/50"
              >
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(ev.value)}
                  onChange={() => toggleEvent(ev.value)}
                  className="mt-0.5 h-4 w-4 accent-sky-500"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{ev.label}</p>
                  <p className="text-xs text-gray-400">{ev.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={saving}
            className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors active:scale-95 disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create endpoint'}
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WebhooksPage(): JSX.Element {
  const { plan, loading: planLoading } = useBillingPlan()
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const enabledCount = endpoints.filter((endpoint) => endpoint.enabled).length
  const focusMessage = loading
    ? 'Loading webhook endpoints and delivery tooling.'
    : endpoints.length === 0
      ? 'Add your first endpoint to start receiving real-time events.'
      : `${enabledCount} endpoint${enabledCount === 1 ? '' : 's'} are enabled and ready to receive Dotly events.`

  const load = useCallback(async () => {
    try {
      const token = await getAccessToken()
      const data = await apiGet<WebhookEndpoint[]>('/webhooks', token)
      setEndpoints(data)
    } catch (e) {
      if (isApiError(e) && (e.statusCode === 403 || e.statusCode === 401)) {
        setPermissionDenied(true)
        setPageError('You do not have permission to manage webhooks.')
      } else {
        setPageError(e instanceof Error ? e.message : 'Failed to load webhooks.')
      }
    } finally {
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
    try {
      const token = await getAccessToken()
      const updated = await apiPut<WebhookEndpoint>(`/webhooks/${id}`, { enabled }, token)
      setEndpoints((prev) => prev.map((ep) => (ep.id === id ? updated : ep)))
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed to toggle webhook.')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this webhook endpoint? All delivery logs will be removed.')) return
    try {
      const token = await getAccessToken()
      await apiDelete(`/webhooks/${id}`, token)
      setEndpoints((prev) => prev.filter((ep) => ep.id !== id))
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed to delete webhook.')
    }
  }

  async function handleRegenerateSecret(id: string) {
    const token = await getAccessToken()
    const updated = await apiPost<WebhookEndpoint>(`/webhooks/${id}/secret`, {}, token)
    setEndpoints((prev) => prev.map((ep) => (ep.id === id ? updated : ep)))
  }

  async function handleTestFire(id: string) {
    const token = await getAccessToken()
    return apiPost<WebhookTestResult>(`/webhooks/${id}/test`, {}, token)
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
            <button
              type="button"
              onClick={() => setPageError(null)}
              className="rounded-full p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
            >
              <X className="h-4 w-4" />
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
              onDelete={() => void handleDelete(ep.id)}
              onRegenerateSecret={() => handleRegenerateSecret(ep.id)}
              onTestFire={() => handleTestFire(ep.id)}
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
    </div>
  )
}
