/**
 * Timezone-aware date formatting utilities.
 *
 * formatDate / formatDateTime accept an explicit `tz` string (IANA identifier).
 * When `tz` is falsy they fall back to the browser's local timezone so the
 * output is never worse than the previous behaviour.
 */

// ── Pure formatting helpers ───────────────────────────────────────────────────

/** Format a UTC ISO string (or Date) as a locale date, pinned to `tz`. */
export function formatDate(
  value: string | Date | null | undefined,
  tz?: string | null,
  locale?: string,
): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return ''
  try {
    return d.toLocaleDateString(locale ?? undefined, {
      timeZone: tz ?? undefined,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return d.toLocaleDateString(locale ?? undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
}

/** Format a UTC ISO string (or Date) as a locale date+time, pinned to `tz`. */
export function formatDateTime(
  value: string | Date | null | undefined,
  tz?: string | null,
  locale?: string,
): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return ''
  try {
    return d.toLocaleString(locale ?? undefined, {
      timeZone: tz ?? undefined,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return d.toLocaleString(locale ?? undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }
}

/**
 * Format a UTC ISO string (or Date) as a locale date+time with timezone label,
 * pinned to `tz`. Used for scheduling / booking displays.
 */
export function formatDateTimeFull(
  value: string | Date | null | undefined,
  tz?: string | null,
  locale?: string,
): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return ''
  try {
    return d.toLocaleString(locale ?? undefined, {
      timeZone: tz ?? undefined,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    })
  } catch {
    return d.toLocaleString(locale ?? undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }
}
