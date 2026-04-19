import { NextResponse } from 'next/server'
import { apiPost } from '@/lib/api'
import { clearServerSession, getRefreshToken } from '@/lib/auth/session'

export async function POST(): Promise<NextResponse> {
  const refreshToken = await getRefreshToken()

  try {
    await apiPost('/auth/sign-out', { refreshToken })
  } finally {
    await clearServerSession()
  }

  return NextResponse.json({ ok: true })
}
