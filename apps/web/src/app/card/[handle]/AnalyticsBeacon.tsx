'use client'
import { useEffect } from 'react'

export function AnalyticsBeacon({ cardId }: { cardId: string }) {
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/public/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardId,
        type: 'VIEW',
        metadata: { referrer: document.referrer },
      }),
    }).catch(() => {})
  }, [cardId])
  return null
}
