'use client'

import type { JSX, ReactNode } from 'react'

type Tone = 'error' | 'warning' | 'info'

const TONE_CLASS: Record<Tone, string> = {
  error: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
}

interface StatusNoticeProps {
  tone?: Tone
  message: ReactNode
  action?: ReactNode
}

export function StatusNotice({ tone = 'error', message, action }: StatusNoticeProps): JSX.Element {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${TONE_CLASS[tone]}`} role="alert">
      <div className="flex items-center justify-between gap-3">
        <span>{message}</span>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}
