import { redirect } from 'next/navigation'
import { getServerAccessToken } from '@/lib/auth/session'
import { apiGet } from '@/lib/api'
import type { UserMeResponse } from '@dotly/types'

export async function getServerUserOrRedirect(authPath = '/auth') {
  try {
    const token = await getServerAccessToken()
    if (!token) {
      redirect(authPath)
    }

    const user = await apiGet<UserMeResponse | null>('/users/me', token)

    if (!user) {
      redirect(authPath)
    }

    return user
  } catch {
    redirect(authPath)
  }
}

export async function getServerSessionAccessTokenOrRedirect(authPath = '/auth') {
  try {
    const token = await getServerAccessToken()
    if (!token) {
      redirect(authPath)
    }

    return token
  } catch {
    redirect(authPath)
  }
}

export async function getServerUserAndTokenOrRedirect(authPath = '/auth') {
  try {
    const token = await getServerAccessToken()
    const user = token ? await apiGet<UserMeResponse | null>('/users/me', token) : null

    if (!user || !token) {
      redirect(authPath)
    }

    return { user, token }
  } catch {
    redirect(authPath)
  }
}
