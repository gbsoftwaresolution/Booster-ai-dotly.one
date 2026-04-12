import { NextResponse } from 'next/server'
import { getServerApiUrl } from '@/lib/server-api'

export async function GET() {
  try {
    const apiUrl = getServerApiUrl()
    const response = await fetch(`${apiUrl}/health`, { cache: 'no-store' })
    const body = await response.text()

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json(
      { status: 'error', service: 'web-health-proxy' },
      {
        status: 502,
        headers: {
          'cache-control': 'no-store',
        },
      },
    )
  }
}
