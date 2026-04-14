'use client'

import { useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { Smartphone, RefreshCw, Wifi, WifiOff, Database, Clock3 } from 'lucide-react'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { usePwa } from '@/components/PwaProvider'
import { readCachedData } from '@/lib/pwa/cache'
import { getPwaMetricsSnapshot, type PwaMetricName } from '@/lib/pwa/metrics'
import {
  getQueuedMutations,
  processQueuedMutations,
  PWA_QUEUE_CHANGED_EVENT,
} from '@/lib/pwa/queue'

function formatTime(value: number | null | undefined): string {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString()
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string | number
  detail: string
  icon: React.ElementType
}): JSX.Element {
  return (
    <div className="app-panel rounded-[24px] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{label}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-950">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{detail}</p>
    </div>
  )
}

export default function PwaInsightsPage(): JSX.Element {
  const { isInstalled, installMethod, hasUpdateReady, isOnline, queuedMutationCount } = usePwa()
  const [isSyncingQueue, setIsSyncingQueue] = useState(false)
  const [queueStatus, setQueueStatus] = useState<string | null>(null)
  const [queueStatusTone, setQueueStatusTone] = useState<'info' | 'warning'>('info')
  const [metrics, setMetrics] = useState(getPwaMetricsSnapshot())
  const [queuedMutations, setQueuedMutations] = useState(getQueuedMutations())

  const cardsCache = readCachedData<unknown[]>('cards:list')
  const contactsCache = readCachedData<unknown>('contacts:list:page=1&limit=20')

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMetrics(getPwaMetricsSnapshot())
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const handleQueueChanged = () => {
      setQueuedMutations(getQueuedMutations())
    }

    window.addEventListener(PWA_QUEUE_CHANGED_EVENT, handleQueueChanged)
    return () => window.removeEventListener(PWA_QUEUE_CHANGED_EVENT, handleQueueChanged)
  }, [])

  const trackedMetrics = useMemo(() => {
    const order: PwaMetricName[] = [
      'pwa_install_available',
      'pwa_install_prompt_opened',
      'pwa_install_prompt_result',
      'pwa_installed',
      'pwa_update_ready',
      'pwa_update_applied',
      'pwa_offline_cards_fallback',
      'pwa_offline_contacts_fallback',
      'pwa_queue_enqueued',
      'pwa_queue_processed',
      'pwa_queue_failed',
    ]

    return order.map((metric) => ({
      key: metric,
      count: metrics.counts[metric] ?? 0,
    }))
  }, [metrics])

  async function handleQueueSync(): Promise<void> {
    setIsSyncingQueue(true)
    setQueueStatus(null)

    try {
      const result = await processQueuedMutations()
      setQueueStatus(
        result.processed > 0
          ? `Synced ${result.processed} queued change${result.processed === 1 ? '' : 's'}.`
          : result.remaining > 0
            ? 'Still waiting for connectivity or a valid session before queued changes can sync.'
            : 'No queued changes to sync.',
      )
      setQueueStatusTone(result.remaining > 0 ? 'warning' : 'info')
      setMetrics(getPwaMetricsSnapshot())
    } finally {
      setIsSyncingQueue(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="app-panel rounded-[28px] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
              <Smartphone className="h-3.5 w-3.5" />
              PWA Insights
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-950">Installed app health</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Monitor install readiness, offline cache freshness, update availability, and queued offline mutations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleQueueSync()}
            disabled={isSyncingQueue}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncingQueue ? 'animate-spin' : ''}`} />
            {isSyncingQueue ? 'Syncing queue…' : 'Retry queued sync'}
          </button>
        </div>
      </div>

      {queueStatus && <StatusNotice tone={queueStatusTone} message={queueStatus} liveMode="polite" />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Install State"
          value={isInstalled ? 'Installed' : installMethod === 'native' ? 'Ready' : installMethod === 'ios' ? 'iPhone steps' : 'Unavailable'}
          detail="Current install capability on this device"
          icon={Smartphone}
        />
        <MetricCard
          label="Connectivity"
          value={isOnline ? 'Online' : 'Offline'}
          detail={hasUpdateReady ? 'A newer app shell is waiting.' : 'No pending app update right now.'}
          icon={isOnline ? Wifi : WifiOff}
        />
        <MetricCard
          label="Queued Changes"
          value={queuedMutationCount}
          detail="Offline mutations waiting to sync"
          icon={Database}
        />
        <MetricCard
          label="Metrics Updated"
          value={formatTime(metrics.lastUpdatedAt)}
          detail="Latest local PWA event sample"
          icon={Clock3}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="app-panel rounded-[28px] p-6">
          <h2 className="text-base font-semibold text-gray-950">Offline cache</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span>Cards list cache</span>
              <span className="font-medium text-gray-900">{formatTime(cardsCache?.updatedAt)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span>Contacts first page cache</span>
              <span className="font-medium text-gray-900">{formatTime(contactsCache?.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="app-panel rounded-[28px] p-6">
          <h2 className="text-base font-semibold text-gray-950">Queued mutations</h2>
          <div className="mt-4 space-y-3">
            {queuedMutations.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">No queued offline changes right now.</p>
            ) : (
              queuedMutations.map((mutation) => (
                <div key={mutation.id} className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-600">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-gray-900">{mutation.type}</span>
                    <span>Attempts: {mutation.attempts}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Queued {formatTime(mutation.createdAt)}</p>
                  {mutation.lastError ? <p className="mt-2 text-xs text-amber-700">Last error: {mutation.lastError}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="app-panel rounded-[28px] p-6">
        <h2 className="text-base font-semibold text-gray-950">Local PWA event counters</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {trackedMetrics.map((metric) => (
            <div key={metric.key} className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{metric.key}</p>
              <p className="mt-2 text-xl font-bold text-gray-950">{metric.count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}