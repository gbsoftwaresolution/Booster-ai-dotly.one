const CHUNK_RECOVERY_KEY = 'dotly:chunk-load-recovery'
const CHUNK_RECOVERY_WINDOW_MS = 30_000

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const message = `${error.name} ${error.message}`

  return /ChunkLoadError|Loading chunk [0-9]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    message,
  )
}

export function recoverFromChunkLoadError(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const now = Date.now()
  const currentPath = `${window.location.pathname}${window.location.search}`
  const rawAttempt = window.sessionStorage.getItem(CHUNK_RECOVERY_KEY)

  if (rawAttempt) {
    try {
      const previousAttempt = JSON.parse(rawAttempt) as { path?: string; at?: number }
      if (
        previousAttempt.path === currentPath &&
        typeof previousAttempt.at === 'number' &&
        now - previousAttempt.at < CHUNK_RECOVERY_WINDOW_MS
      ) {
        return false
      }
    } catch {
      window.sessionStorage.removeItem(CHUNK_RECOVERY_KEY)
    }
  }

  window.sessionStorage.setItem(
    CHUNK_RECOVERY_KEY,
    JSON.stringify({ path: currentPath, at: now }),
  )

  const nextUrl = new URL(window.location.href)
  nextUrl.searchParams.set('__chunk_reload', String(now))
  window.location.replace(nextUrl.toString())
  return true
}