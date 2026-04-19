import { NextRequest, NextResponse } from 'next/server'
import { apiPost, ApiError } from '@/lib/api'
import { getRefreshToken, getServerAccessTokenOrRedirect } from '@/lib/auth/session'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as {
    newEmail?: string
    currentPassword?: string
  }

  if (!body.newEmail || !body.currentPassword) {
    return NextResponse.json({ error: 'Invalid email change payload' }, { status: 400 })
  }

  try {
    const accessToken = await getServerAccessTokenOrRedirect('/auth')
    const refreshToken = await getRefreshToken()
    await apiPost(
      '/users/me/email-change',
      {
        newEmail: body.newEmail,
        currentPassword: body.currentPassword,
        refreshToken,
      },
      accessToken,
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      )
    }
    throw error
  }
}
