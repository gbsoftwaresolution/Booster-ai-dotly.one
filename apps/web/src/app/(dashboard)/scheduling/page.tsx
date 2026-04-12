'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StatusNotice } from '@/components/ui/StatusNotice'
import {
  Calendar,
  Clock,
  Copy,
  Edit2,
  MapPin,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Link2,
  Settings2,
} from 'lucide-react'
import { SelectField } from '@/components/ui/SelectField'
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import { useUserTimezone } from '@/hooks/useUserLocale'
import { formatDateTimeFull } from '@/lib/tz'
import type { ItemsResponse } from '@dotly/types'
import {
  AptTypeForm,
  AvailabilityEditor,
  QuestionsBuilder,
  SchedulingConfirmDialog,
} from './components'
import { ALL_DAYS, API_URL, copyToClipboard, statusColors } from './helpers'
import type { AppointmentType, Booking, ConfirmState, DayOfWeek, GoogleStatusState } from './types'

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SchedulingPage(): JSX.Element {
  const userTz = useUserTimezone()
  const router = useRouter()
  const searchParams = useSearchParams()
  const loadRequestIdRef = useRef(0)
  const [aptTypes, setAptTypes] = useState<AppointmentType[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Modal state
  const [showAptForm, setShowAptForm] = useState(false)
  const [editingApt, setEditingApt] = useState<AppointmentType | null>(null)
  const [availEditorFor, setAvailEditorFor] = useState<AppointmentType | null>(null)
  const [questionsEditorFor, setQuestionsEditorFor] = useState<AppointmentType | null>(null)

  // Google Calendar
  const [googleStatus, setGoogleStatus] = useState<GoogleStatusState | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [deletingAppointmentTypeId, setDeletingAppointmentTypeId] = useState<string | null>(null)
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [appointmentTypesError, setAppointmentTypesError] = useState<string | null>(null)
  const [bookingsError, setBookingsError] = useState<string | null>(null)
  const [cardsError, setCardsError] = useState<string | null>(null)

  // Tab: 'types' | 'bookings'
  const [tab, setTab] = useState<'types' | 'bookings'>('types')
  const [showAllBookings, setShowAllBookings] = useState(false)

  // Cards for booking link — allow user to select which card to use
  const [allCards, setAllCards] = useState<{ id: string; handle: string }[]>([])
  const [cardHandle, setCardHandle] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getToken = useCallback(async () => (await getAccessToken()) ?? undefined, [])

  function showToast(msg: string, ok = true) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ msg, ok })
    toastTimerRef.current = setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const load = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current
    setLoading(true)
    setError(null)
    setAppointmentTypesError(null)
    setBookingsError(null)
    setCardsError(null)
    try {
      const token = await getAccessToken()
      const [types, bkgs, cardsResp, gStatus] = await Promise.allSettled([
        apiGet<ItemsResponse<AppointmentType>>('/scheduling/appointment-types', token ?? undefined),
        apiGet<ItemsResponse<Booking>>(
          `/scheduling/bookings${showAllBookings ? '' : '?upcoming=true'}`,
          token ?? undefined,
        ),
        apiGet<ItemsResponse<{ id: string; handle: string }>>('/cards', token ?? undefined),
        apiGet<{ connected: boolean; googleEmail?: string }>(
          '/scheduling/google/status',
          token ?? undefined,
        ).catch((error: unknown) => ({
          state: 'unavailable' as const,
          message:
            error instanceof Error ? error.message : 'Google Calendar status is unavailable.',
        })),
      ])
      if (loadRequestIdRef.current !== requestId) return
      if (types.status === 'fulfilled') {
        setAptTypes(types.value.items)
      } else {
        setAppointmentTypesError(
          types.reason instanceof Error
            ? types.reason.message
            : 'Appointment types are unavailable.',
        )
      }

      if (bkgs.status === 'fulfilled') {
        setBookings(bkgs.value.items)
      } else {
        setBookingsError(
          bkgs.reason instanceof Error ? bkgs.reason.message : 'Bookings are unavailable.',
        )
      }

      if (cardsResp.status === 'fulfilled') {
        setAllCards(cardsResp.value.items)
        if (cardsResp.value.items.length > 0 && cardsResp.value.items[0]) {
          setCardHandle((prev) => prev ?? cardsResp.value.items[0]?.handle ?? null)
        }
      } else {
        setCardsError(
          cardsResp.reason instanceof Error ? cardsResp.reason.message : 'Cards are unavailable.',
        )
      }

      if (gStatus.status === 'fulfilled') {
        if ('state' in gStatus.value) {
          setGoogleStatus(gStatus.value)
        } else {
          setGoogleStatus(
            gStatus.value.connected
              ? { state: 'connected', googleEmail: gStatus.value.googleEmail }
              : { state: 'disconnected' },
          )
        }
      } else {
        setGoogleStatus({ state: 'unavailable', message: 'Google Calendar status is unavailable.' })
      }

      if (
        types.status === 'rejected' &&
        bkgs.status === 'rejected' &&
        cardsResp.status === 'rejected' &&
        gStatus.status === 'rejected'
      ) {
        throw new Error('Failed to load scheduling.')
      }
    } catch (e) {
      if (loadRequestIdRef.current !== requestId) return
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      if (loadRequestIdRef.current !== requestId) return
      setLoading(false)
    }
  }, [showAllBookings])

  const loadAppointmentTypes = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current
    try {
      const token = await getToken()
      const types = await apiGet<ItemsResponse<AppointmentType>>(
        '/scheduling/appointment-types',
        token,
      )
      if (loadRequestIdRef.current !== requestId) return
      setAptTypes(types.items)
    } catch (e) {
      if (loadRequestIdRef.current !== requestId) return
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
  }, [getToken])

  useEffect(() => {
    const requestedTab = searchParams.get('tab')
    if (requestedTab === 'types' || requestedTab === 'bookings') {
      setTab(requestedTab)
    }
  }, [searchParams])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    const nextUrl = `${window.location.pathname}?${params.toString()}`
    const currentUrl = `${window.location.pathname}${window.location.search}`
    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false })
    }
  }, [router, searchParams, tab])

  useEffect(() => {
    if (searchParams.get('google') === 'connected') return
    void load()
  }, [load, searchParams])

  // Handle ?google=connected / ?google=error redirect from OAuth callback
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const g = params.get('google')
    if (g === 'connected') {
      showToast('Google Calendar connected!')
      params.delete('google')
      const next = params.toString()
      window.history.replaceState(
        {},
        '',
        next ? `${window.location.pathname}?${next}` : window.location.pathname,
      )
      void load()
    } else if (g === 'error') {
      showToast('Failed to connect Google Calendar', false)
      params.delete('google')
      const next = params.toString()
      window.history.replaceState(
        {},
        '',
        next ? `${window.location.pathname}?${next}` : window.location.pathname,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreateOrUpdate(data: {
    name: string
    slug: string
    description: string
    durationMins: number
    color: string
    bufferDays: number
    bufferAfterMins: number
    location: string
    isActive: boolean
    timezone: string
  }) {
    try {
      const token = await getToken()
      if (editingApt) {
        await apiPatch(`/scheduling/appointment-types/${editingApt.id}`, data, token)
        showToast('Appointment type updated')
      } else {
        await apiPost('/scheduling/appointment-types', data, token)
        showToast('Appointment type created')
      }
      setShowAptForm(false)
      setEditingApt(null)
      await loadAppointmentTypes()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error'
      showToast(message, false)
      throw e instanceof Error ? e : new Error(message)
    }
  }

  async function handleDelete(id: string) {
    if (deletingAppointmentTypeId) return
    setDeletingAppointmentTypeId(id)
    try {
      const token = await getToken()
      await apiDelete(`/scheduling/appointment-types/${id}`, token)
      showToast('Deleted')
      setAptTypes((prev) => prev.filter((apt) => apt.id !== id))
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', false)
    } finally {
      setDeletingAppointmentTypeId(null)
    }
  }

  async function handleSaveAvailability(
    apt: AppointmentType,
    rules: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }[],
  ) {
    try {
      const token = await getToken()
      await apiPut(`/scheduling/appointment-types/${apt.id}/availability`, { rules }, token)
      showToast('Availability saved')
      setAvailEditorFor(null)
      await loadAppointmentTypes()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', false)
    }
  }

  async function handleCancelBooking(bookingId: string) {
    if (cancellingBookingId) return
    setCancellingBookingId(bookingId)
    try {
      const token = await getToken()
      await apiPatch(`/scheduling/bookings/${bookingId}/cancel`, {}, token)
      showToast('Booking cancelled')
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status: 'CANCELLED' } : booking,
        ),
      )
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', false)
    } finally {
      setCancellingBookingId(null)
    }
  }

  async function handleGoogleDisconnect() {
    setGoogleLoading(true)
    try {
      const token = await getToken()
      await apiDelete('/scheduling/google/disconnect', token)
      setGoogleStatus({ state: 'disconnected' })
      showToast('Google Calendar disconnected')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', false)
    } finally {
      setGoogleLoading(false)
    }
  }

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || ''

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {toast.ok ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Availability Editor Modal */}
      {availEditorFor && (
        <AvailabilityEditor
          initial={availEditorFor.availabilityRules}
          onSave={(rules) => void handleSaveAvailability(availEditorFor, rules)}
          onClose={() => setAvailEditorFor(null)}
        />
      )}

      {/* Questions Builder Modal */}
      {questionsEditorFor && (
        <QuestionsBuilder
          appointmentTypeId={questionsEditorFor.id}
          initial={questionsEditorFor.questions}
          onSave={() => {
            setQuestionsEditorFor(null)
            showToast('Questions saved')
            void loadAppointmentTypes()
          }}
          onClose={() => setQuestionsEditorFor(null)}
        />
      )}

      {/* Create/Edit Appointment Type Modal */}
      {showAptForm && (
        <AptTypeForm
          initial={editingApt ?? undefined}
          onSave={handleCreateOrUpdate}
          onClose={() => {
            setShowAptForm(false)
            setEditingApt(null)
          }}
        />
      )}

      {confirmState && (
        <SchedulingConfirmDialog
          title={
            confirmState.type === 'appointment-type'
              ? 'Deactivate appointment type'
              : confirmState.type === 'booking'
                ? 'Cancel booking'
                : 'Disconnect Google Calendar'
          }
          message={
            confirmState.type === 'appointment-type'
              ? 'Deactivate this appointment type? It will be hidden and no longer bookable. Existing bookings are preserved.'
              : confirmState.type === 'booking'
                ? 'Cancel this booking?'
                : 'Disconnect Google Calendar?'
          }
          confirmLabel={
            confirmState.type === 'appointment-type'
              ? 'Deactivate'
              : confirmState.type === 'booking'
                ? 'Cancel booking'
                : 'Disconnect'
          }
          onCancel={() => setConfirmState(null)}
          onConfirm={() => {
            const current = confirmState
            setConfirmState(null)
            if (current.type === 'appointment-type') {
              void handleDelete(current.id)
            } else if (current.type === 'booking') {
              void handleCancelBooking(current.id)
            } else {
              void handleGoogleDisconnect()
            }
          }}
        />
      )}

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="app-panel flex flex-col gap-5 rounded-[30px] px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Scheduling</h1>
              <p className="text-sm text-gray-500">Manage your booking pages and appointments</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingApt(null)
              setShowAptForm(true)
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" /> New Appointment Type
          </button>
        </div>

        {/* Google Calendar connect section */}
        {googleStatus !== null && (
          <div className="app-panel flex items-center gap-3 rounded-[24px] px-4 py-3">
            <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-700">Google Calendar</span>
              {googleStatus.state === 'connected' && googleStatus.googleEmail && (
                <span className="ml-2 text-xs text-gray-400">{googleStatus.googleEmail}</span>
              )}
              {googleStatus.state === 'unavailable' && (
                <span className="ml-2 text-xs text-amber-600">Status unavailable</span>
              )}
            </div>
            {googleStatus.state === 'connected' ? (
              <button
                onClick={() => setConfirmState({ type: 'google-disconnect' })}
                disabled={googleLoading}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {googleLoading ? 'Disconnecting…' : 'Disconnect'}
              </button>
            ) : googleStatus.state === 'unavailable' ? (
              <button
                onClick={() => void load()}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
              >
                Retry status
              </button>
            ) : (
              <a
                href={`${API_URL}/scheduling/google/connect`}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
              >
                <Settings2 className="inline h-3.5 w-3.5 mr-1" />
                Connect Google Calendar
              </a>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="app-panel-subtle flex w-fit gap-1 rounded-[20px] p-1.5">
          {(['types', 'bookings'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm ring-1 ring-white/80' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'types'
                ? 'Appointment Types'
                : `Upcoming Bookings${bookings.length > 0 ? ` (${bookings.length})` : ''}`}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {appointmentTypesError && (
          <StatusNotice tone="warning" message={appointmentTypesError} liveMode="polite" />
        )}
        {bookingsError && <StatusNotice tone="warning" message={bookingsError} liveMode="polite" />}
        {cardsError && <StatusNotice tone="warning" message={cardsError} liveMode="polite" />}

        {/* ── Card selector for booking links ───────────────────────────────── */}
        {allCards.length > 1 && !cardsError && (
          <div className="app-panel flex flex-col gap-3 rounded-[24px] px-4 py-3 sm:flex-row sm:items-center">
            <span className="text-sm font-medium text-gray-600">Booking links use card:</span>
            <SelectField
              value={cardHandle ?? ''}
              onChange={(e) => setCardHandle(e.target.value)}
              className="rounded-xl px-3 py-2.5 pr-10 focus:border-sky-500 focus:ring-sky-100"
            >
              {allCards.map((c) => (
                <option key={c.id} value={c.handle}>
                  /{c.handle}
                </option>
              ))}
            </SelectField>
          </div>
        )}

        {/* ── Appointment Types Tab ─────────────────────────────────────────── */}
        {!loading && !error && tab === 'types' && (
          <div className="space-y-4">
            {aptTypes.length === 0 ? (
              <div className="app-empty-state">
                <Calendar className="mb-4 h-12 w-12 text-slate-300" />
                <p className="text-gray-600">No appointment types yet.</p>
                <p className="mt-2 max-w-md text-sm text-gray-400">
                  Create your first appointment type to start sharing booking links and collecting
                  meetings.
                </p>
                <button
                  onClick={() => {
                    setEditingApt(null)
                    setShowAptForm(true)
                  }}
                  className="mt-4 flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-700"
                >
                  <Plus className="h-4 w-4" /> Create your first
                </button>
              </div>
            ) : (
              aptTypes.map((apt) => {
                const bookingUrl = cardHandle ? `${webUrl}/book/${cardHandle}/${apt.slug}` : null
                const busy = deletingAppointmentTypeId === apt.id
                return (
                  <div key={apt.id} className="app-panel rounded-[28px] p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div
                          className="mt-0.5 h-10 w-10 flex-shrink-0 rounded-xl"
                          style={{ background: apt.color }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{apt.name}</h3>
                            {!apt.isActive && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                Inactive
                              </span>
                            )}
                          </div>
                          {apt.description && (
                            <p className="mt-0.5 text-sm text-gray-500">{apt.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {apt.durationMins} min
                            </span>
                            {apt.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {apt.location}
                              </span>
                            )}
                            <span className="text-gray-400">{apt._count.bookings} bookings</span>
                            <span className="text-gray-400">{apt.timezone}</span>
                          </div>
                          {/* Availability summary */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {ALL_DAYS.map((d) => {
                              const windows = apt.availabilityRules.filter((r) => r.dayOfWeek === d)
                              return (
                                <span
                                  key={d}
                                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${windows.length > 0 ? 'bg-sky-50 text-sky-700' : 'bg-gray-50 text-gray-300'}`}
                                >
                                  {d}
                                  {windows.length > 0
                                    ? ' ' +
                                      windows.map((w) => `${w.startTime}–${w.endTime}`).join(', ')
                                    : ''}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {bookingUrl && (
                          <button
                            title="Copy booking link"
                            onClick={() => {
                              void copyToClipboard(bookingUrl).then((ok) => {
                                if (ok) showToast('Link copied!')
                                else showToast('Failed to copy link', false)
                              })
                            }}
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-sky-600"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          title="Edit questions"
                          onClick={() => setQuestionsEditorFor(apt)}
                          disabled={busy || deletingAppointmentTypeId !== null}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50 disabled:opacity-50"
                        >
                          Questions{apt.questions.length > 0 ? ` (${apt.questions.length})` : ''}
                        </button>
                        <button
                          title="Edit availability"
                          onClick={() => setAvailEditorFor(apt)}
                          disabled={busy || deletingAppointmentTypeId !== null}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-50 disabled:opacity-50"
                        >
                          Availability
                        </button>
                        <button
                          title="Edit"
                          onClick={() => {
                            setEditingApt(apt)
                            setShowAptForm(true)
                          }}
                          disabled={busy || deletingAppointmentTypeId !== null}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-sky-600 disabled:opacity-50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => setConfirmState({ type: 'appointment-type', id: apt.id })}
                          disabled={busy || deletingAppointmentTypeId !== null}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {bookingUrl && (
                      <div className="app-panel-subtle mt-3 flex items-center gap-2 rounded-[20px] px-3 py-2">
                        <span className="truncate font-mono text-xs text-gray-500">
                          {bookingUrl}
                        </span>
                        <button
                          onClick={() => {
                            void copyToClipboard(bookingUrl).then((ok) => {
                              if (ok) showToast('Link copied!')
                              else showToast('Failed to copy link', false)
                            })
                          }}
                          className="flex-shrink-0 text-sky-600 hover:text-sky-700"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── Bookings Tab ──────────────────────────────────────────────────── */}
        {!loading && !error && tab === 'bookings' && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {showAllBookings ? 'All bookings' : 'Upcoming bookings'}
              </p>
              <button
                onClick={() => setShowAllBookings((v) => !v)}
                className="text-xs font-medium text-sky-600 hover:text-sky-700"
              >
                {showAllBookings ? 'Show upcoming only' : 'Show all bookings'}
              </button>
            </div>
            <div className="app-table-shell overflow-hidden">
              {bookings.length === 0 ? (
                <div className="app-empty-state rounded-none border-0 shadow-none">
                  <Calendar className="mb-4 h-12 w-12 text-slate-300" />
                  <p className="text-gray-600">No upcoming bookings.</p>
                </div>
              ) : (
                <table className="app-table">
                  <thead className="border-b border-white/60">
                    <tr>
                      <th>Guest</th>
                      <th>Appointment</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80">
                    {bookings.map((b) => {
                      const busy = cancellingBookingId === b.id
                      return (
                        <tr key={b.id} className="transition hover:bg-white/65">
                          <td>
                            <div className="font-medium text-gray-900">{b.guestName}</div>
                            <div className="text-gray-400">{b.guestEmail}</div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                style={{ background: b.appointmentType.color }}
                              />
                              {b.appointmentType.name}
                            </div>
                          </td>
                          <td className="text-gray-600">{formatDateTimeFull(b.startAt, userTz)}</td>
                          <td>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[b.status] ?? ''}`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td>
                            {b.status !== 'CANCELLED' && (
                              <button
                                disabled={busy || cancellingBookingId !== null}
                                onClick={() => setConfirmState({ type: 'booking', id: b.id })}
                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                              >
                                {busy ? 'Cancelling...' : 'Cancel'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
