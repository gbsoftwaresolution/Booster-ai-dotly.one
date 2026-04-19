import { NextRequest, NextResponse } from 'next/server'
import { apiPost, ApiError } from '@/lib/api'
import { setServerSession } from '@/lib/auth/session'

type SignInResponse = {
  accessToken: string
  refreshToken: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as {
    email?: string
    password?: string
  }

  if (!body.email || !body.password) {
    return NextResponse.json({ error: 'Invalid sign-in payload' }, { status: 400 })
  }

  try {
    const session = await apiPost<SignInResponse>('/auth/sign-in', body)
    await setServerSession(session)
    return NextResponse.json({ accessToken: session.accessToken })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details, path: error.path },
        { status: error.statusCode },
      )
    }
    throw error
  }
}
