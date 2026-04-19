'use client'

import { apiPost, ApiError } from '@/lib/api'

let inMemoryAccessToken: string | undefined

type SessionResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

type ExistingSessionResponse = {
  accessToken: string
}

function getStoredAccessToken(): string | undefined {
  return inMemoryAccessToken
}

export function storeAccessToken(accessToken: string): void {
  inMemoryAccessToken = accessToken
}

export function storeClientSession(session: { accessToken: string; refreshToken: string }): void {
  storeAccessToken(session.accessToken)
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
  inMemoryAccessToken = undefined
}

export async function clearPersistedSession(): Promise<void> {
  clearClientSession()
  await syncServerSession(null)
}

async function refreshClientSession(): Promise<string | undefined> {
  try {
    const refreshed = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
    })
    if (!refreshed.ok) {
      throw new ApiError({
        message: `API ${refreshed.status}`,
        statusCode: refreshed.status,
      })
    }
    const nextSession = (await refreshed.json()) as SessionResponse
    await persistSession({
      accessToken: nextSession.accessToken,
      refreshToken: nextSession.refreshToken,
    })
    return nextSession.accessToken
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      await clearPersistedSession()
      return undefined
    }
    throw error
  }
}

async function loadServerAccessToken(): Promise<string | undefined> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    })

    if (!response.ok) {
      if (response.status === 401) return undefined
      throw new ApiError({
        message: `API ${response.status}`,
        statusCode: response.status,
      })
    }

    const session = (await response.json()) as ExistingSessionResponse
    storeAccessToken(session.accessToken)
    return session.accessToken
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      return undefined
    }
    throw error
  }
}

export async function getAccessToken(): Promise<string | undefined> {
  const accessToken = getStoredAccessToken()
  if (accessToken) return accessToken

  const serverAccessToken = await loadServerAccessToken()
  if (serverAccessToken) return serverAccessToken

  return refreshClientSession()
}

export async function signOut(): Promise<void> {
  try {
    await fetch('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
    })
  } finally {
    await clearPersistedSession()
  }
}
