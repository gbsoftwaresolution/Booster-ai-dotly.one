'use client'

import { Button } from '@/components/ui/button'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { usePwa } from '@/components/PwaProvider'

export function PwaUpdatePrompt(): null | React.JSX.Element {
  const { hasUpdateReady, isApplyingUpdate, applyUpdate } = usePwa()

  if (!hasUpdateReady) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:px-4">
      <div className="pointer-events-auto w-full max-w-2xl">
        <StatusNotice
          tone="info"
          liveMode="polite"
          message="A newer version of Dotly.one is ready. Refresh into the latest app shell when you’re ready."
          action={
            <Button type="button" size="sm" onClick={applyUpdate} disabled={isApplyingUpdate}>
              {isApplyingUpdate ? 'Updating…' : 'Update now'}
            </Button>
          }
        />
      </div>
    </div>
  )
}