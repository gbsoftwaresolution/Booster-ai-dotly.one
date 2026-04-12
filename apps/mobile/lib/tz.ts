/**
 * Timezone-aware date formatting utilities for the mobile app.
 *
 * Formatting functions are pure / synchronous — pass the user's IANA timezone
 * string (e.g. "America/New_York") obtained from `getUserTimezone()`.
 *
 * `getUserTimezone()` fetches /users/me once per app session (module-level
 * cache) and returns the saved timezone, falling back to the device default.
 */

import { api } from './api'

// ── Module-level cache ────────────────────────────────────────────────────────

let _cached: string | null | undefined = undefined // undefined = not yet fetched
let _fetchPromise: Promise<string | null> | null = null

/**
 * Returns the user's saved IANA timezone string, or `null` if not set.
 * The result is cached for the lifetime of the JS process.
 */
export async function getUserTimezone(): Promise<string | null> {
  if (_cached !== undefined) return _cached

  if (!_fetchPromise) {
    _fetchPromise = (async () => {
      try {
        const me = (await api.getMe()) as { timezone?: string | null } | null
        _cached = me?.timezone ?? null
      } catch {
        _cached = undefined
      } finally {
        _fetchPromise = null
      }
      return _cached ?? null
    })()
  }

  return _fetchPromise
}

// ── Formatting helpers ────────────────────────────────────────────────────────

/**
 * Formats a date-only value (no time) respecting the given timezone.
 * Falls back to the device locale when `tz` is falsy.
 */
export function formatDate(value: string | null | undefined, tz?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...(tz ? { timeZone: tz } : {}),
    }).format(date)
  } catch {
    return date.toLocaleDateString()
  }
}

/**
 * Formats a date + time value respecting the given timezone.
 * Falls back to the device locale when `tz` is falsy.
 */
export function formatDateTime(value: string | null | undefined, tz?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      ...(tz ? { timeZone: tz } : {}),
    }).format(date)
  } catch {
    return date.toLocaleString()
  }
}
