import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { apiPost, ApiError } from '@/lib/api'

const ACCESS_COOKIE = 'dotly_access_token'
const REFRESH_COOKIE = 'dotly_refresh_token'
const ACCESS_MAX_AGE_SECONDS = 60 * 15
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export type AppSession = {
  accessToken: string
  refreshToken: string
}

type SessionResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  }
}

export async function setServerSession(session: AppSession): Promise<void> {
  const store = await cookies()
  store.set(ACCESS_COOKIE, session.accessToken, cookieOptions(ACCESS_MAX_AGE_SECONDS))
  store.set(REFRESH_COOKIE, session.refreshToken, cookieOptions(REFRESH_MAX_AGE_SECONDS))
}

export async function clearServerSession(): Promise<void> {
  const store = await cookies()
  store.set(ACCESS_COOKIE, '', cookieOptions(0))
  store.set(REFRESH_COOKIE, '', cookieOptions(0))
}

async function refreshServerSession(refreshToken: string): Promise<string | null> {
  try {
    const refreshed = await apiPost<SessionResponse>('/auth/refresh', { refreshToken })
    await setServerSession({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
    })
    return refreshed.accessToken
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      await clearServerSession()
      return null
    }
    throw error
  }
}

export async function getServerAccessToken(): Promise<string | undefined> {
  const store = await cookies()
  const accessToken = store.get(ACCESS_COOKIE)?.value
  if (accessToken) return accessToken

  const refreshToken = store.get(REFRESH_COOKIE)?.value
  if (!refreshToken) return undefined

  return (await refreshServerSession(refreshToken)) ?? undefined
}

export async function getServerAccessTokenOrRedirect(authPath = '/auth'): Promise<string> {
  const token = await getServerAccessToken()
  if (!token) {
    redirect(authPath)
  }
  return token
}
