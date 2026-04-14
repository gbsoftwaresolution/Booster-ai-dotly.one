'use client'

import { X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { usePwa } from '@/components/PwaProvider'

function shouldOfferOnPath(pathname: string): boolean {
  const hiddenPrefixes = ['/auth/callback', '/book/', '/card/', '/internal/']
  return !hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))
}

export function PwaInstallPrompt(): null | React.JSX.Element {
  const pathname = usePathname()
  const {
    installMethod,
    isInstallPromptVisible,
    isPromptingInstall,
    promptInstall,
    dismissInstallPrompt,
  } = usePwa()

  if (!pathname || !isInstallPromptVisible || !shouldOfferOnPath(pathname)) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
      <div
        className={cn(
          'pointer-events-auto w-full max-w-xl rounded-[28px] border border-white/80 bg-white/88 p-4 text-slate-900 shadow-[0_28px_70px_-32px_rgba(15,23,42,0.42)] backdrop-blur-2xl',
          'sm:p-5',
        )}
        role="dialog"
        aria-live="polite"
        aria-label="Install Dotly.one"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
              Install app
            </div>
            <p className="mt-3 text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
              Add Dotly.one to your home screen for a faster, app-like launch.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {installMethod === 'native'
                ? 'Open cards, CRM, and scheduling from your device like a native app.'
                : 'On iPhone or iPad, tap Share in Safari, then choose Add to Home Screen.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss install prompt"
            onClick={dismissInstallPrompt}
            className="app-touch-target inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => void promptInstall()}
            disabled={isPromptingInstall}
          >
            {isPromptingInstall
              ? 'Opening install prompt…'
              : installMethod === 'native'
                ? 'Install Dotly.one'
                : 'Show iPhone steps'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={dismissInstallPrompt}
          >
            {installMethod === 'native' ? 'Not now' : 'Got it'}
          </Button>
        </div>
      </div>
    </div>
  )
}