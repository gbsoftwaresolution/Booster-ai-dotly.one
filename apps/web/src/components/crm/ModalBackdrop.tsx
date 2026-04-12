'use client'

import type { JSX } from 'react'

export function ModalBackdrop({
  onClick,
  tone = 'default',
  zIndexClass = 'z-40',
}: {
  onClick?: () => void
  tone?: 'default' | 'drawer'
  zIndexClass?: string
}): JSX.Element {
  return (
    <div
      className={[
        'fixed inset-0 backdrop-blur-sm',
        zIndexClass,
        tone === 'drawer' ? 'bg-black/40' : 'bg-black/50',
      ].join(' ')}
      onClick={onClick}
      aria-hidden="true"
    />
  )
}
