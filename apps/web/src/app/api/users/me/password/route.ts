import { NextRequest, NextResponse } from 'next/server'
import { apiPatch, ApiError } from '@/lib/api'
import { getRefreshToken, getServerAccessTokenOrRedirect } from '@/lib/auth/session'

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as {
    currentPassword?: string
    newPassword?: string
  }

  if (!body.currentPassword || !body.newPassword) {
    return NextResponse.json({ error: 'Invalid password change payload' }, { status: 400 })
  }

  try {
    const accessToken = await getServerAccessTokenOrRedirect('/auth')
    const refreshToken = await getRefreshToken()
    await apiPatch(
      '/users/me/password',
      {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
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
