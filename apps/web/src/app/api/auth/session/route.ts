import { NextRequest, NextResponse } from 'next/server'
import { clearServerSession, setServerSession } from '@/lib/auth/session'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as {
    accessToken?: string
    refreshToken?: string
  }

  if (!body.accessToken || !body.refreshToken) {
    return NextResponse.json({ error: 'Invalid session payload' }, { status: 400 })
  }

  await setServerSession({
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(): Promise<NextResponse> {
  await clearServerSession()
  return NextResponse.json({ ok: true })
}
