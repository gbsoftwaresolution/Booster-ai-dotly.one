import { NextResponse } from 'next/server'
import { apiPost, ApiError } from '@/lib/api'
import { clearServerSession, getRefreshToken, setServerSession } from '@/lib/auth/session'

type SessionResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export async function POST(): Promise<NextResponse> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) {
    return NextResponse.json({ error: 'Missing refresh session' }, { status: 401 })
  }

  try {
    const session = await apiPost<SessionResponse>('/auth/refresh', { refreshToken })
    await setServerSession({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    })
    return NextResponse.json(session)
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      await clearServerSession()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw error
  }
}
