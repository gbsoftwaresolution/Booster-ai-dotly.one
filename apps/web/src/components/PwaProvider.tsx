'use client'

import posthog from 'posthog-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { incrementPwaMetric } from '@/lib/pwa/metrics'
import {
  getQueuedMutationCount,
  processQueuedMutations,
  PWA_QUEUE_CHANGED_EVENT,
} from '@/lib/pwa/queue'

const DISMISS_KEY = 'dotly-pwa-install-dismissed-at'
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type PwaContextValue = {
  isInstalled: boolean
  canInstall: boolean
  installMethod: 'native' | 'ios' | null
  isInstallPromptVisible: boolean
  isPromptingInstall: boolean
  hasUpdateReady: boolean
  isApplyingUpdate: boolean
  isOnline: boolean
  queuedMutationCount: number
  promptInstall: () => Promise<void>
  dismissInstallPrompt: () => void
  openInstallPrompt: () => void
  applyUpdate: () => void
}

const PwaContext = createContext<PwaContextValue | null>(null)

function capturePwaEvent(eventName: string, properties?: Record<string, unknown>): void {
  incrementPwaMetric(eventName as never)

  if (typeof window === 'undefined' || !posthog.__loaded) {
    return
  }

  posthog.capture(eventName, properties)
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (typeof navigator !== 'undefined' &&
      'standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }

  const userAgent = navigator.userAgent
  const isIosDevice = /iPad|iPhone|iPod/.test(userAgent)
  const isWebKit = /WebKit/.test(userAgent)
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS/.test(userAgent)

  return isIosDevice && isWebKit && !isOtherBrowser
}

function canRegisterServiceWorker(): boolean {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  if (process.env.NODE_ENV !== 'production') {
    return false
  }

  return window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname)
}

function wasDismissedRecently(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const storedValue = window.localStorage.getItem(DISMISS_KEY)
  if (!storedValue) {
    return false
  }

  const dismissedAt = Number.parseInt(storedValue, 10)
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_TTL_MS
}

function setWaitingWorker(
  registration: ServiceWorkerRegistration,
  updateWaiting: (worker: ServiceWorker | null) => void,
): void {
  if (registration.waiting && navigator.serviceWorker.controller) {
    updateWaiting(registration.waiting)
  }
}

export function PwaProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [supportsIosManualInstall, setSupportsIosManualInstall] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [manuallyOpened, setManuallyOpened] = useState(false)
  const [isPromptingInstall, setIsPromptingInstall] = useState(false)
  const [waitingWorker, setWaitingWorkerState] = useState<ServiceWorker | null>(null)
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [queuedMutationCount, setQueuedMutationCount] = useState(0)
  const hasCapturedInstallAvailable = useRef(false)
  const hasCapturedIosGuidance = useRef(false)
  const hasCapturedUpdateReady = useRef(false)
  const isReloadingForUpdate = useRef(false)

  useEffect(() => {
    setInstalled(isStandaloneMode())
    setSupportsIosManualInstall(isIosSafari())
    setDismissed(wasDismissedRecently())
    setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine)
    setQueuedMutationCount(getQueuedMutationCount())
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      void processQueuedMutations().then(({ remaining }) => {
        setQueuedMutationCount(remaining)
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    const handleQueueChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ count?: number }>).detail
      setQueuedMutationCount(detail?.count ?? getQueuedMutationCount())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener(PWA_QUEUE_CHANGED_EVENT, handleQueueChanged)

    void processQueuedMutations().then(({ remaining }) => {
      setQueuedMutationCount(remaining)
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener(PWA_QUEUE_CHANGED_EVENT, handleQueueChanged)
    }
  }, [])

  useEffect(() => {
    if (supportsIosManualInstall && !hasCapturedIosGuidance.current) {
      capturePwaEvent('pwa_install_guidance_available', { method: 'ios-manual' })
      hasCapturedIosGuidance.current = true
    }
  }, [supportsIosManualInstall])

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      if (!hasCapturedInstallAvailable.current) {
        capturePwaEvent('pwa_install_available', { method: 'native' })
        hasCapturedInstallAvailable.current = true
      }
    }

    const handleAppInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
      setDismissed(false)
      setManuallyOpened(false)
      window.localStorage.removeItem(DISMISS_KEY)
      capturePwaEvent('pwa_installed')
    }

    const handleOpenPrompt = () => {
      setDismissed(false)
      setManuallyOpened(true)
      capturePwaEvent('pwa_install_prompt_opened', {
        source: deferredPrompt ? 'native-entry' : 'ios-guidance',
      })
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('dotly:pwa-open', handleOpenPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('dotly:pwa-open', handleOpenPrompt)
    }
  }, [deferredPrompt])

  useEffect(() => {
    if (!canRegisterServiceWorker()) {
      return
    }

    const handleControllerChange = () => {
      if (isReloadingForUpdate.current) {
        return
      }

      isReloadingForUpdate.current = true
      window.location.reload()
    }

    let updateFoundRegistration: ServiceWorkerRegistration | null = null

    void navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        setWaitingWorker(registration, setWaitingWorkerState)

        registration.addEventListener('updatefound', () => {
          updateFoundRegistration = registration
          const installing = registration.installing
          if (!installing) {
            return
          }

          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') {
              setWaitingWorker(registration, setWaitingWorkerState)
            }
          })
        })

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
      })
      .catch((error: unknown) => {
        capturePwaEvent('pwa_service_worker_registration_failed', {
          message: error instanceof Error ? error.message : 'unknown',
        })
      })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      if (updateFoundRegistration) {
        updateFoundRegistration.onupdatefound = null
      }
    }
  }, [])

  useEffect(() => {
    if (waitingWorker && !hasCapturedUpdateReady.current) {
      capturePwaEvent('pwa_update_ready')
      hasCapturedUpdateReady.current = true
    }

    if (!waitingWorker) {
      hasCapturedUpdateReady.current = false
    }
  }, [waitingWorker])

  const installMethod = deferredPrompt ? 'native' : supportsIosManualInstall ? 'ios' : null
  const canInstall = !installed && installMethod !== null
  const isInstallPromptVisible = canInstall && (manuallyOpened || !dismissed)

  const promptInstall = useCallback(async (): Promise<void> => {
    if (deferredPrompt) {
      setIsPromptingInstall(true)
      capturePwaEvent('pwa_install_prompt_opened', { source: 'native' })

      try {
        await deferredPrompt.prompt()
        const result = await deferredPrompt.userChoice
        capturePwaEvent('pwa_install_prompt_result', { outcome: result.outcome })

        if (result.outcome === 'accepted') {
          setInstalled(true)
        }

        setDeferredPrompt(null)
        setManuallyOpened(false)
      } finally {
        setIsPromptingInstall(false)
      }

      return
    }

    if (supportsIosManualInstall) {
      setDismissed(false)
      setManuallyOpened(true)
      capturePwaEvent('pwa_install_prompt_opened', { source: 'ios-guidance' })
    }
  }, [deferredPrompt, supportsIosManualInstall])

  const dismissInstallPrompt = useCallback((): void => {
    setDismissed(true)
    setManuallyOpened(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    }
    capturePwaEvent('pwa_install_prompt_dismissed')
  }, [])

  const openInstallPrompt = useCallback((): void => {
    setDismissed(false)
    setManuallyOpened(true)
    capturePwaEvent('pwa_install_prompt_opened', {
      source: deferredPrompt ? 'reopen-native' : 'reopen-ios-guidance',
    })
  }, [deferredPrompt])

  const applyUpdate = useCallback((): void => {
    if (!waitingWorker) {
      return
    }

    setIsApplyingUpdate(true)
    capturePwaEvent('pwa_update_applied')
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }, [waitingWorker])

  const value = useMemo<PwaContextValue>(
    () => ({
      isInstalled: installed,
      canInstall,
      installMethod,
      isInstallPromptVisible,
      isPromptingInstall,
      hasUpdateReady: waitingWorker !== null,
      isApplyingUpdate,
      isOnline,
      queuedMutationCount,
      promptInstall,
      dismissInstallPrompt,
      openInstallPrompt,
      applyUpdate,
    }),
    [
      installed,
      canInstall,
      installMethod,
      isInstallPromptVisible,
      isPromptingInstall,
      waitingWorker,
      isApplyingUpdate,
      isOnline,
      queuedMutationCount,
      promptInstall,
      dismissInstallPrompt,
      openInstallPrompt,
      applyUpdate,
    ],
  )

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>
}

export function usePwa(): PwaContextValue {
  const context = useContext(PwaContext)
  if (!context) {
    throw new Error('usePwa must be used within PwaProvider')
  }

  return context
}