'use client'

import { useState, useEffect } from 'react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet } from '@/lib/api'

interface UserLocale {
  timezone: string | null
  country: string | null
}

// Module-level cache so multiple components share one fetch per page load.
let _cached: UserLocale | null = null
let _promise: Promise<UserLocale> | null = null

async function loadUserLocale(): Promise<UserLocale> {
  if (_cached) return _cached
  if (_promise) return _promise

  _promise = (async () => {
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('unauthenticated')
      const user = await apiGet<{ timezone?: string | null; country?: string | null }>(
        '/users/me',
        token,
      )
      const locale: UserLocale = {
        timezone: user.timezone ?? null,
        country: user.country ?? null,
      }
      _cached = locale
      return locale
    } catch {
      // Fall back gracefully — browser timezone is always safe
      const locale: UserLocale = { timezone: null, country: null }
      _cached = locale
      return locale
    }
  })()

  return _promise
}

/**
 * Returns the authenticated user's saved timezone (IANA string) and country
 * (ISO 3166-1 alpha-2).  Falls back to null while loading or on error.
 *
 * Use `tz ?? undefined` when passing to Intl APIs — undefined makes them
 * use the browser's local timezone, which is an acceptable fallback.
 */
export function useUserLocale(): UserLocale & { loading: boolean } {
  const [state, setState] = useState<UserLocale & { loading: boolean }>({
    timezone: null,
    country: null,
    loading: true,
  })

  useEffect(() => {
    // If already cached, resolve synchronously on next tick
    void loadUserLocale().then((locale) => {
      setState({ ...locale, loading: false })
    })
  }, [])

  return state
}

/** Convenience: just the IANA timezone string (or null). */
export function useUserTimezone(): string | null {
  return useUserLocale().timezone
}
