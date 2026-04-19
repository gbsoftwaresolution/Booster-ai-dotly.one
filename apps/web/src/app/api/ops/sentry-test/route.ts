import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function POST(): Promise<NextResponse> {
  const sentryEnabled = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)

  if (!sentryEnabled) {
    return NextResponse.json({ ok: false, error: 'Sentry is not configured' }, { status: 412 })
  }

  const error = new Error('Dotly observability smoke test')
  Sentry.captureException(error, {
    tags: {
      source: 'observability_smoke_test',
      surface: 'web',
    },
  })
  await Sentry.flush(2000)

  return NextResponse.json({ ok: true })
}
