export interface CachedEntry<T> {
  data: T
  updatedAt: number
}

const CACHE_PREFIX = 'dotly:pwa:cache:'

function getCacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`
}

export function saveCachedData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const entry: CachedEntry<T> = { data, updatedAt: Date.now() }
    window.localStorage.setItem(getCacheKey(key), JSON.stringify(entry))
  } catch {
    // Ignore storage quota and serialization failures.
  }
}

export function readCachedData<T>(key: string): CachedEntry<T> | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(getCacheKey(key))
    if (!raw) {
      return null
    }

    return JSON.parse(raw) as CachedEntry<T>
  } catch {
    return null
  }
}