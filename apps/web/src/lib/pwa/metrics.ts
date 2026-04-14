export type PwaMetricName =
  | 'pwa_install_available'
  | 'pwa_install_guidance_available'
  | 'pwa_install_prompt_opened'
  | 'pwa_install_prompt_result'
  | 'pwa_install_prompt_dismissed'
  | 'pwa_installed'
  | 'pwa_update_ready'
  | 'pwa_update_applied'
  | 'pwa_service_worker_registration_failed'
  | 'pwa_offline_cards_fallback'
  | 'pwa_offline_contacts_fallback'
  | 'pwa_queue_enqueued'
  | 'pwa_queue_processed'
  | 'pwa_queue_failed'

export interface PwaMetricsSnapshot {
  counts: Partial<Record<PwaMetricName, number>>
  lastUpdatedAt: number | null
}

const METRICS_KEY = 'dotly:pwa:metrics'

function readMetrics(): PwaMetricsSnapshot {
  if (typeof window === 'undefined') {
    return { counts: {}, lastUpdatedAt: null }
  }

  try {
    const raw = window.localStorage.getItem(METRICS_KEY)
    if (!raw) {
      return { counts: {}, lastUpdatedAt: null }
    }

    return JSON.parse(raw) as PwaMetricsSnapshot
  } catch {
    return { counts: {}, lastUpdatedAt: null }
  }
}

function writeMetrics(snapshot: PwaMetricsSnapshot): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(METRICS_KEY, JSON.stringify(snapshot))
  } catch {
    // Ignore storage errors.
  }
}

export function incrementPwaMetric(metric: PwaMetricName): void {
  const snapshot = readMetrics()
  snapshot.counts[metric] = (snapshot.counts[metric] ?? 0) + 1
  snapshot.lastUpdatedAt = Date.now()
  writeMetrics(snapshot)
}

export function getPwaMetricsSnapshot(): PwaMetricsSnapshot {
  return readMetrics()
}