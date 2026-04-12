'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Copy, Play, RefreshCw, Trash2, X } from 'lucide-react'
import type { ItemsResponse } from '@dotly/types'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { cn } from '@/lib/cn'
import { apiGet, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/tz'
import { useUserTimezone } from '@/hooks/useUserLocale'
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap'
import { ModalBackdrop } from '@/components/crm/ModalBackdrop'
import { ALL_EVENTS } from './helpers'
import type { WebhookDelivery, WebhookEndpoint, WebhookTestResult } from './types'

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
      <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-mono text-gray-700">
        {revealed ? secret : '••••••••••••••••••••••••••••••••'}
      </code>
      <button
        type="button"
        onClick={() => setRevealed((value) => !value)}
        className="shrink-0 text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
      >
        {revealed ? 'Hide' : 'Show'}
      </button>
      <button
        type="button"
        onClick={() => void copy()}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
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
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setError(null)
      const token = await getAccessToken()
      const data = await apiGet<ItemsResponse<WebhookDelivery>>(
        `/webhooks/${endpointId}/deliveries`,
        token,
      )
      setDeliveries(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deliveries.')
    } finally {
      setLoading(false)
    }
  }, [endpointId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <div className="py-4 text-center text-xs text-gray-400">Loading…</div>
  if (error) {
    return (
      <div className="py-4 text-center text-xs text-red-500">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-2 font-semibold text-brand-600"
        >
          Retry log
        </button>
      </div>
    )
  }
  if (deliveries.length === 0)
    return <div className="py-4 text-center text-xs text-gray-400">No deliveries yet.</div>

  return (
    <div className="divide-y divide-gray-100">
      {deliveries.map((delivery) => (
        <div key={delivery.id} className="flex items-center gap-3 px-1 py-2">
          <StatusBadge success={delivery.success} code={delivery.statusCode} />
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-gray-700">
            {delivery.event}
          </span>
          {delivery.durationMs !== null && (
            <span className="text-[10px] text-gray-400">{delivery.durationMs}ms</span>
          )}
          <span className="text-[10px] text-gray-300">
            {formatDateTime(delivery.deliveredAt, userTz)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function EndpointCard({
  endpoint,
  onToggle,
  onDelete,
  onRegenerateSecret,
  onTestFire,
  busy,
}: {
  endpoint: WebhookEndpoint
  onToggle: (enabled: boolean) => void
  onDelete: () => void
  onRegenerateSecret: () => Promise<void>
  onTestFire: () => Promise<WebhookTestResult>
  busy: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [testing, setTesting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'err' | null>(null)
  const [testErrorMessage, setTestErrorMessage] = useState<string | null>(null)

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    setTestErrorMessage(null)
    try {
      const result = await onTestFire()
      if (!result.success)
        throw new Error(
          result.responseBody || `Delivery failed with status ${result.statusCode ?? 'unknown'}`,
        )
      setTestResult('ok')
      setShowLog(true)
    } catch (err) {
      setTestResult('err')
      setTestErrorMessage(err instanceof Error ? err.message : 'Webhook test failed.')
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
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => onToggle(!endpoint.enabled)}
          disabled={busy}
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
        <span
          className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800"
          title={endpoint.url}
        >
          {endpoint.url}
        </span>
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
          {endpoint.events.length} event{endpoint.events.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          disabled={busy}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
      {expanded && (
        <div className="flex flex-col gap-4 border-t border-gray-100 bg-gray-50/60 px-4 py-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Subscribed events
            </p>
            <div className="flex flex-wrap gap-1.5">
              {endpoint.events.map((event) => (
                <span
                  key={event}
                  className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-600"
                >
                  {event}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Signing secret
            </p>
            {endpoint.secret ? <SecretDisplay secret={endpoint.secret} /> : <SecretUnavailable />}
            <button
              type="button"
              onClick={() => void handleRegenerate()}
              disabled={regenerating || busy}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3 w-3', regenerating && 'animate-spin')} />
              Regenerate secret
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleTest()}
              disabled={testing || busy}
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
              onClick={() => setShowLog((value) => !value)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50"
            >
              Delivery log
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="ml-auto flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>
          {testErrorMessage && <p className="text-xs text-red-500">{testErrorMessage}</p>}
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

export function CreateModal({
  onCreated,
  onClose,
}: {
  onCreated: (endpoint: WebhookEndpoint) => void
  onClose: () => void
}) {
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((value) => value !== event) : [...prev, event],
    )
  }

  async function handleCreate() {
    if (!url.trim()) {
      setError('URL is required.')
      return
    }
    try {
      const parsedUrl = new URL(url.trim())
      if (parsedUrl.protocol !== 'https:') {
        setError('Webhook URL must start with https://')
        return
      }
    } catch {
      setError('Enter a valid webhook URL.')
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
      const endpoint = await apiPost<WebhookEndpoint>(
        '/webhooks',
        { url: url.trim(), events: selectedEvents },
        token,
      )
      onCreated(endpoint)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create endpoint.')
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
        <div className="mb-4">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Endpoint URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-server.com/webhooks/dotly"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
          />
        </div>
        <div className="mb-5">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Events to send
          </label>
          <div className="flex flex-col gap-2">
            {ALL_EVENTS.map((event) => (
              <label
                key={event.value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 transition-colors hover:border-brand-300 hover:bg-brand-50/50"
              >
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(event.value)}
                  onChange={() => toggleEvent(event.value)}
                  className="mt-0.5 h-4 w-4 accent-sky-500"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{event.label}</p>
                  <p className="text-xs text-gray-400">{event.description}</p>
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
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={saving}
            className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition-colors active:scale-95 hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create endpoint'}
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  )
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useDialogFocusTrap({
    active: true,
    containerRef: dialogRef,
    initialFocusRef: cancelButtonRef,
    onEscape: onCancel,
  })

  return (
    <>
      <ModalBackdrop onClick={onCancel} tone="drawer" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="webhooks-confirm-dialog-title"
        className="fixed inset-x-4 top-1/2 z-50 w-full max-w-sm -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
      >
        <h3 id="webhooks-confirm-dialog-title" className="text-sm font-semibold text-gray-900">
          {title}
        </h3>
        <p className="mt-1 text-sm text-gray-600">{message}</p>
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
            Delete
          </button>
        </div>
      </div>
    </>
  )
}
