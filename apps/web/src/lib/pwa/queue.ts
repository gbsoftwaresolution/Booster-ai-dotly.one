import { apiPatch, isApiError } from '@/lib/api'
import { incrementPwaMetric } from '@/lib/pwa/metrics'
import { getAccessToken } from '@/lib/auth/client'

export const PWA_QUEUE_CHANGED_EVENT = 'dotly:pwa-queue-changed'

export interface QueuedNotificationPrefsMutation {
  id: string
  type: 'notification-preferences'
  payload: {
    notifLeadCaptured: boolean
    notifWeeklyDigest: boolean
    notifProductUpdates: boolean
  }
  createdAt: number
  attempts: number
  lastError?: string
}

export interface QueuedContactBulkStageMutation {
  id: string
  type: 'contact-bulk-stage'
  payload: {
    ids: string[]
    stage: string
  }
  createdAt: number
  attempts: number
  lastError?: string
}

export type QueuedMutation = QueuedNotificationPrefsMutation | QueuedContactBulkStageMutation

const QUEUE_KEY = 'dotly:pwa:mutation-queue'

function readQueue(): QueuedMutation[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(QUEUE_KEY)
    if (!raw) {
      return []
    }
    return JSON.parse(raw) as QueuedMutation[]
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedMutation[]): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    window.dispatchEvent(new CustomEvent(PWA_QUEUE_CHANGED_EVENT, { detail: { count: queue.length } }))
  } catch {
    // Ignore storage errors.
  }
}

export function getQueuedMutationCount(): number {
  return readQueue().length
}

export function getQueuedMutations(): QueuedMutation[] {
  return readQueue()
}

export function enqueueNotificationPrefsMutation(
  payload: QueuedNotificationPrefsMutation['payload'],
): number {
  const queue = readQueue()
  const nextEntry: QueuedNotificationPrefsMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    type: 'notification-preferences',
    payload,
    createdAt: Date.now(),
    attempts: 0,
  }

  const filteredQueue: QueuedMutation[] = queue.filter(
    (entry) => entry.type !== 'notification-preferences',
  )
  filteredQueue.push(nextEntry)
  writeQueue(filteredQueue)
  incrementPwaMetric('pwa_queue_enqueued')

  return filteredQueue.length
}

export function enqueueContactBulkStageMutation(
  payload: QueuedContactBulkStageMutation['payload'],
): number {
  const queue = readQueue()
  const nextEntry: QueuedContactBulkStageMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    type: 'contact-bulk-stage',
    payload,
    createdAt: Date.now(),
    attempts: 0,
  }

  const filteredQueue: QueuedMutation[] = queue.filter(
    (entry) =>
      !(
        entry.type === 'contact-bulk-stage' &&
        JSON.stringify([...entry.payload.ids].sort()) === JSON.stringify([...payload.ids].sort())
      ),
  )
  filteredQueue.push(nextEntry)
  writeQueue(filteredQueue)
  incrementPwaMetric('pwa_queue_enqueued')

  return filteredQueue.length
}

export async function processQueuedMutations(): Promise<{ processed: number; remaining: number }> {
  if (typeof window === 'undefined') {
    return { processed: 0, remaining: 0 }
  }

  if (!navigator.onLine) {
    return { processed: 0, remaining: getQueuedMutationCount() }
  }

  const queue = readQueue()
  if (queue.length === 0) {
    return { processed: 0, remaining: 0 }
  }

  const token = await getAccessToken()
  let processed = 0
  const remainingQueue: QueuedMutation[] = []

  for (const entry of queue) {
    try {
      if (entry.type === 'notification-preferences') {
        await apiPatch('/users/me', entry.payload, token)
      }

      if (entry.type === 'contact-bulk-stage') {
        await apiPatch('/contacts/bulk-stage', entry.payload, token)
      }

      processed += 1
      incrementPwaMetric('pwa_queue_processed')
    } catch (error) {
      if (isApiError(error) && error.statusCode > 0 && error.statusCode < 500) {
        incrementPwaMetric('pwa_queue_failed')
        continue
      }

      remainingQueue.push({
        ...entry,
        attempts: entry.attempts + 1,
        lastError: error instanceof Error ? error.message : 'Unknown queue processing error',
      })
      incrementPwaMetric('pwa_queue_failed')
    }
  }

  writeQueue(remainingQueue)
  return { processed, remaining: remainingQueue.length }
}