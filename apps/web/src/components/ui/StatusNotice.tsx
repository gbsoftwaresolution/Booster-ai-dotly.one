'use client'

import type { JSX, ReactNode } from 'react'

type Tone = 'error' | 'warning' | 'info'
type LiveMode = 'assertive' | 'polite'

const TONE_CLASS: Record<Tone, string> = {
  error: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
}

interface StatusNoticeProps {
  tone?: Tone
  message: ReactNode
  action?: ReactNode
  liveMode?: LiveMode
}

export function StatusNotice({
  tone = 'error',
  message,
  action,
  liveMode,
}: StatusNoticeProps): JSX.Element {
  const resolvedLiveMode = liveMode ?? (tone === 'error' ? 'assertive' : 'polite')
  const role = resolvedLiveMode === 'assertive' ? 'alert' : 'status'

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${TONE_CLASS[tone]}`}
      role={role}
      aria-live={resolvedLiveMode}
    >
      <div className="flex items-center justify-between gap-3">
        <span>{message}</span>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}
