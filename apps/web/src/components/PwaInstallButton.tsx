'use client'

import { Download } from 'lucide-react'
import { cn } from '@/lib/cn'
import { usePwa } from '@/components/PwaProvider'

interface PwaInstallButtonProps {
  className?: string
  label?: string
}

export function PwaInstallButton({
  className,
  label = 'Install app',
}: PwaInstallButtonProps): null | React.JSX.Element {
  const { canInstall, isPromptingInstall, promptInstall } = usePwa()

  if (!canInstall) {
    return null
  }

  return (
    <button
      type="button"
      onClick={() => void promptInstall()}
      disabled={isPromptingInstall}
      className={cn(className)}
    >
      <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
      {isPromptingInstall ? 'Opening…' : label}
    </button>
  )
}