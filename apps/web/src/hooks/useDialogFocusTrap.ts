'use client'

import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface UseDialogFocusTrapOptions {
  active: boolean
  containerRef: RefObject<HTMLElement | null>
  initialFocusRef?: RefObject<HTMLElement | null>
  onEscape?: () => void
}

export function useDialogFocusTrap({
  active,
  containerRef,
  initialFocusRef,
  onEscape,
}: UseDialogFocusTrapOptions): void {
  useEffect(() => {
    if (!active) return

    const previousActiveElement = document.activeElement as HTMLElement | null

    const focusInitialElement = () => {
      const initialElement = initialFocusRef?.current
      if (initialElement && !initialElement.hasAttribute('disabled')) {
        initialElement.focus()
        return
      }

      const focusableElements = Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      )
      focusableElements[0]?.focus()
    }

    queueMicrotask(focusInitialElement)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current) return

      if (event.key === 'Escape') {
        if (!onEscape) return
        event.preventDefault()
        event.stopPropagation()
        onEscape()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      )

      if (focusableElements.length === 0) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        event.stopPropagation()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        event.stopPropagation()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      previousActiveElement?.focus()
    }
  }, [active, containerRef, initialFocusRef, onEscape])
}
