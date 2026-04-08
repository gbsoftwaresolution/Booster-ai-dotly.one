'use client'
import { useState } from 'react'
import { CardRenderer } from '@dotly/ui'
import type { CardRendererProps } from '@dotly/types'
import { AnalyticsBeacon } from './AnalyticsBeacon'
import { LeadCaptureModal } from './LeadCaptureModal'
import { ShareBar } from './ShareBar'

interface CardViewProps extends CardRendererProps {
  cardHandle: string
  ownerName: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function postAnalytics(body: Record<string, unknown>) {
  fetch(`${API_URL}/public/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

export function CardView({ cardHandle, ownerName, ...rendererProps }: CardViewProps) {
  const [leadModalOpen, setLeadModalOpen] = useState(false)

  function handleSocialLinkClick(platform: string, url: string) {
    postAnalytics({
      cardId: rendererProps.card.id,
      type: 'CLICK',
      metadata: { platform, url },
    })
  }

  function handleSaveContact() {
    postAnalytics({
      cardId: rendererProps.card.id,
      type: 'SAVE',
      metadata: {},
    })
    // Open vCard download
    window.open(`${API_URL}/public/cards/${cardHandle}/vcard`, '_blank')
  }

  return (
    <>
      <CardRenderer
        {...rendererProps}
        mode="web"
        onLeadCapture={() => setLeadModalOpen(true)}
        onSocialLinkClick={handleSocialLinkClick}
        onSaveContact={handleSaveContact}
      />

      {/* Share bar — shown below the card */}
      <ShareBar handle={cardHandle} ownerName={ownerName} />

      {leadModalOpen && (
        <LeadCaptureModal
          cardId={rendererProps.card.id}
          cardHandle={cardHandle}
          ownerName={ownerName}
          onClose={() => setLeadModalOpen(false)}
        />
      )}

      <AnalyticsBeacon cardId={rendererProps.card.id} />
    </>
  )
}
