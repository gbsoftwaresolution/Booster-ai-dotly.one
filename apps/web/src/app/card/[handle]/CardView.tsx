'use client'
import { useState } from 'react'
import { CardRenderer } from '@dotly/ui'
import type { CardRendererProps } from '@dotly/types'
import { AnalyticsBeacon } from './AnalyticsBeacon'
import { LeadCaptureModal } from './LeadCaptureModal'

interface CardViewProps extends CardRendererProps {
  cardHandle: string
  ownerName: string
}

export function CardView({ cardHandle, ownerName, ...rendererProps }: CardViewProps) {
  const [leadModalOpen, setLeadModalOpen] = useState(false)

  return (
    <>
      <CardRenderer
        {...rendererProps}
        mode="web"
        onLeadCapture={() => setLeadModalOpen(true)}
      />

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
