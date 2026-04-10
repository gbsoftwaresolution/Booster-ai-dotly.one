'use client'
import { useEffect } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export function AnalyticsBeacon({ cardId }: { cardId: string }) {
  useEffect(() => {
    const url = `${API_BASE}/public/analytics`
    const body = JSON.stringify({ cardId, type: 'VIEW' })

    // Prefer sendBeacon so the event survives page unload / navigation.
    // sendBeacon sends a plain-text body by default; wrap it as a Blob with the
    // correct Content-Type so NestJS's JSON body-parser accepts it.
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(url, blob)
    } else {
      // Fallback: keepalive:true ensures the request outlives the document.
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  }, [cardId])

  return null
}
