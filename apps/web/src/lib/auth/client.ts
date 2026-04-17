'use client'

import { apiPost, ApiError } from '@/lib/api'

const ACCESS_STORAGE_KEY = 'dotly_access_token'
const REFRESH_STORAGE_KEY = 'dotly_refresh_token'

type SessionResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

function getStoredAccessToken(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return window.localStorage.getItem(ACCESS_STORAGE_KEY) ?? undefined
}

function getStoredRefreshToken(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return window.localStorage.getItem(REFRESH_STORAGE_KEY) ?? undefined
}

export function storeClientSession(session: { accessToken: string; refreshToken: string }): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ACCESS_STORAGE_KEY, session.accessToken)
  window.localStorage.setItem(REFRESH_STORAGE_KEY, session.refreshToken)
}

async function syncServerSession(session: { accessToken: string; refreshToken: string } | null) {
  if (typeof window === 'undefined') return
  await fetch('/api/auth/session', {
    method: session ? 'POST' : 'DELETE',
    headers: session ? { 'Content-Type': 'application/json' } : undefined,
    body: session ? JSON.stringify(session) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
  })
}

export async function persistSession(session: {
  accessToken: string
  refreshToken: string
}): Promise<void> {
  storeClientSession(session)
  await syncServerSession(session)
}

export function clearClientSession(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(ACCESS_STORAGE_KEY)
  window.localStorage.removeItem(REFRESH_STORAGE_KEY)
}

export async function clearPersistedSession(): Promise<void> {
  clearClientSession()
  await syncServerSession(null)
}

async function refreshClientSession(refreshToken: string): Promise<string | undefined> {
  try {
    const refreshed = await apiPost<SessionResponse>('/auth/refresh', { refreshToken })
    await persistSession({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
    })
    return refreshed.accessToken
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      await clearPersistedSession()
      return undefined
    }
    throw error
  }
}

export async function getAccessToken(): Promise<string | undefined> {
  const accessToken = getStoredAccessToken()
  if (accessToken) return accessToken

  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) return undefined

  return refreshClientSession(refreshToken)
}

export async function signOut(): Promise<void> {
  const refreshToken = getStoredRefreshToken()
  try {
    await apiPost('/auth/sign-out', { refreshToken })
  } finally {
    await clearPersistedSession()
  }
}
