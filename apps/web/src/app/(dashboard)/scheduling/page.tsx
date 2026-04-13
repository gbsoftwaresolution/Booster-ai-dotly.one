'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const loadRequestIdRef = useRef(0)
  const autoOpenedAvailabilityRef = useRef(false)
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
  const schedulingBasePath = pathname.startsWith('/scheduling') ? '/scheduling' : '/apps/scheduling'
  const routeView =
    pathname === '/apps/scheduling/appointment-types' || pathname === '/scheduling/appointment-types'
      ? 'appointment-types'
      : pathname === '/apps/scheduling/availability' || pathname === '/scheduling/availability'
        ? 'availability'
        : pathname === '/apps/scheduling/bookings' || pathname === '/scheduling/bookings'
          ? 'bookings'
          : null
  const isAvailabilityRoute = routeView === 'availability'
  const routeTab = routeView === 'bookings' ? 'bookings' : routeView ? 'types' : null
  const pageTitle =
    routeView === 'appointment-types'
      ? 'Appointment Types'
      : routeView === 'availability'
        ? 'Availability'
        : routeView === 'bookings'
          ? 'Bookings'
          : 'Scheduling'
  const pageDescription =
    routeView === 'appointment-types'
      ? 'Create, manage, and share your bookable appointment types.'
      : routeView === 'availability'
        ? 'Choose when each appointment type can be booked and adjust weekly hours.'
        : routeView === 'bookings'
          ? 'Review and manage your upcoming booking schedule.'
          : 'Manage your booking pages and appointments'
  const selectedAvailabilityTypeId = searchParams.get('typeId')
  const googleStatusConfigError =
    googleStatus?.state === 'unavailable' &&
    googleStatus.message.toLowerCase().includes('not configured')
      ? googleStatus.message
      : null

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

  useEffect(() => {
    if (!isAvailabilityRoute) {
      autoOpenedAvailabilityRef.current = false
      return
    }

    if (loading || availEditorFor || autoOpenedAvailabilityRef.current) {
      return
    }

    if (selectedAvailabilityTypeId) {
      const matchingType = aptTypes.find((apt) => apt.id === selectedAvailabilityTypeId)
      if (matchingType) {
        autoOpenedAvailabilityRef.current = true
        setAvailEditorFor(matchingType)
      }
      return
    }

    if (aptTypes.length !== 1) {
      return
    }

    autoOpenedAvailabilityRef.current = true
    setAvailEditorFor(aptTypes[0] ?? null)
  }, [aptTypes, availEditorFor, isAvailabilityRoute, loading, selectedAvailabilityTypeId])

  function updateAvailabilitySelection(typeId: string | null) {
    if (!isAvailabilityRoute) return

    const params = new URLSearchParams(searchParams.toString())
    if (typeId) {
      params.set('typeId', typeId)
    } else {
      params.delete('typeId')
    }
    const nextQuery = params.toString()
    router.replace(
      nextQuery ? `${schedulingBasePath}/availability?${nextQuery}` : `${schedulingBasePath}/availability`,
      { scroll: false },
    )
  }

  function openAvailabilityFor(apt: AppointmentType) {
    if (isAvailabilityRoute) {
      updateAvailabilitySelection(apt.id)
      setAvailEditorFor(apt)
      autoOpenedAvailabilityRef.current = true
      return
    }

    router.push(`${schedulingBasePath}/availability?typeId=${apt.id}`)
  }

  function closeAvailabilityEditor() {
    setAvailEditorFor(null)
    if (isAvailabilityRoute && selectedAvailabilityTypeId) {
      updateAvailabilitySelection(null)
      autoOpenedAvailabilityRef.current = false
    }
  }

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
    if (routeTab) {
      setTab(routeTab)
      return
    }

    const requestedTab = searchParams.get('tab')
    if (requestedTab === 'types' || requestedTab === 'bookings') {
      setTab(requestedTab)
    }
  }, [routeTab, searchParams])

  useEffect(() => {
    if (routeTab) return

    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    const nextUrl = `${window.location.pathname}?${params.toString()}`
    const currentUrl = `${window.location.pathname}${window.location.search}`
    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false })
    }
  }, [routeTab, router, searchParams, tab])

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

  async function handleGoogleConnect() {
    setGoogleLoading(true)
    try {
      const token = await getToken()
      const response = await apiGet<{ url: string }>('/scheduling/google/connect-url', token)
      if (!response.url) {
        throw new Error('Google Calendar authorization URL is unavailable.')
      }
      window.location.assign(response.url)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to start Google Calendar connection', false)
      setGoogleLoading(false)
    }
  }

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || ''

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out fill-mode-both">
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
          onClose={closeAvailabilityEditor}
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

      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        {/* Header */}
        <div className="group relative flex flex-col gap-6 overflow-hidden rounded-[40px] border border-white/60 bg-white/40 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-700 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] hover:bg-white/50 ring-1 ring-black/5 mb-8">
          <div className="absolute inset-0 transition-opacity duration-1000 opacity-20 group-hover:opacity-40 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at center, #94a3b8 1.5px, transparent 1.5px)", backgroundSize: "32px 32px" }} /><div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/10 pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-5 text-center sm:text-left w-full sm:w-auto">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-indigo-50 to-sky-50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_8px_16px_-6px_rgba(79,70,229,0.2)] text-indigo-600 border border-white ring-1 ring-indigo-100 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 mb-1 sm:mb-2">{pageTitle}</h1>
              <p className="text-sm sm:text-base font-medium text-slate-500 max-w-[280px] sm:max-w-none mx-auto sm:mx-0 leading-relaxed">{pageDescription}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingApt(null)
              setShowAptForm(true)
            }}
            className="group/btn relative z-10 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-extrabold text-white shadow-[0_0_20px_-5px_rgba(79,70,229,0.4)] transition-all duration-500 hover:scale-105 hover:bg-indigo-500 hover:shadow-[0_0_40px_-10px_rgba(79,70,229,0.7)] active:scale-95 sm:w-auto ring-1 ring-indigo-500/50"
          >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover/btn:translate-x-[200%]" /><Plus className="h-4 w-4 relative z-10" /> <span className="relative z-10">New Appointment Type</span>
          </button>
        </div>

        {/* Google Calendar connect section */}
        {googleStatus !== null && (
          <div className="flex items-center gap-3 rounded-[24px] border border-sky-100 bg-sky-50/50 px-5 py-4 backdrop-blur-md shadow-inner">
            <Link2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold uppercase tracking-wider text-slate-600">Google Calendar</span>
              {googleStatus.state === 'connected' && googleStatus.googleEmail && (
                <span className="ml-2 text-sm font-medium text-slate-500">{googleStatus.googleEmail}</span>
              )}
              {googleStatus.state === 'unavailable' && (
                <span className="ml-2 text-xs text-amber-600">
                  {googleStatusConfigError ? 'Configuration required' : 'Status unavailable'}
                </span>
              )}
              {googleStatus.state === 'unavailable' && (
                <p className="mt-1 text-xs leading-relaxed text-amber-700">
                  {googleStatusConfigError ?? googleStatus.message}
                  {googleStatusConfigError
                    ? ' Add API_URL, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_STATE_SECRET to apps/api/.env and restart the API.'
                    : ''}
                </p>
              )}
            </div>
            {googleStatus.state === 'connected' ? (
              <button
                onClick={() => setConfirmState({ type: 'google-disconnect' })}
                disabled={googleLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-50 hover:border-rose-200 active:scale-95 disabled:opacity-50"
              >
                {googleLoading ? 'Disconnecting…' : 'Disconnect'}
              </button>
            ) : googleStatus.state === 'unavailable' ? (
              <button
                onClick={() => void load()}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-[13px] font-bold text-amber-700 shadow-sm transition-all hover:bg-amber-100 active:scale-95"
              >
                Retry status
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleGoogleConnect()}
                disabled={googleLoading}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95"
              >
                <Settings2 className="inline h-3.5 w-3.5 mr-1" />
                {googleLoading ? 'Connecting…' : 'Connect Google Calendar'}
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        {routeView ? (
          <div className="flex flex-wrap gap-2 rounded-[24px] bg-white/40 p-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-white/60 backdrop-blur-2xl mb-8 relative before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/60 before:via-white/20 before:to-white/60 before:pointer-events-none before:rounded-[24px]">
            {[
              { href: schedulingBasePath, label: 'Overview', active: false },
              {
                href: `${schedulingBasePath}/appointment-types`,
                label: 'Appointment Types',
                active: routeView === 'appointment-types',
              },
              {
                href: `${schedulingBasePath}/availability`,
                label: 'Availability',
                active: routeView === 'availability',
              },
              {
                href: `${schedulingBasePath}/bookings`,
                label: `Bookings${bookings.length > 0 ? ` (${bookings.length})` : ''}`,
                active: routeView === 'bookings',
              },
            ].map(({ href, label, active }) => (
              <Link
                key={href}
                href={href}
                className={`relative rounded-[14px] px-6 py-2.5 text-sm font-bold transition-all ${active ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/60' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
              >
                {label}
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex w-fit gap-1 rounded-2xl bg-white/50 p-1.5 shadow-sm border border-slate-200/60 backdrop-blur-xl mb-6">
            {(['types', 'bookings'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative rounded-[18px] px-6 py-3 text-sm font-extrabold transition-all duration-500 ${tab === t ? "bg-white text-indigo-600 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] ring-1 ring-black/5 scale-[1.02]" : "text-slate-500 hover:text-slate-800 hover:bg-white/60 hover:shadow-sm"}`}
              >
                {t === 'types'
                  ? 'Appointment Types'
                  : `Upcoming Bookings${bookings.length > 0 ? ` (${bookings.length})` : ''}`}
              </button>
            ))}
          </div>
        )}

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
          <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200/60 bg-white/60 p-5 backdrop-blur-xl sm:flex-row sm:items-center">
            <span className="text-sm font-bold uppercase tracking-wider text-slate-500">Booking links use card:</span>
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
            {isAvailabilityRoute && aptTypes.length > 0 && (
              <div className="rounded-[24px] border border-sky-100 bg-sky-50/60 px-5 py-4 text-sm text-slate-600 shadow-inner backdrop-blur-md">
                <p className="font-bold uppercase tracking-wider text-sky-700">Availability Setup</p>
                <p className="mt-1">
                  Availability is managed per appointment type. Choose a type below to edit its
                  weekly hours and booking windows.
                </p>
              </div>
            )}
            {aptTypes.length === 0 ? (
              <div className="relative mx-auto mt-8 max-w-2xl overflow-hidden rounded-[32px] border border-slate-200/60 bg-white/60 p-12 text-center shadow-sm backdrop-blur-xl">
                <Calendar className="mx-auto mb-6 h-20 w-20 text-sky-400 opacity-80 drop-shadow-sm" />
                <p className="text-xl font-extrabold text-slate-900 mb-2">No appointment types yet.</p>
                <p className="mx-auto max-w-sm text-sm font-medium text-slate-500 mb-8">
                  {isAvailabilityRoute
                    ? 'Create an appointment type before setting availability windows.'
                    : 'Create your first appointment type to start sharing booking links and collecting meetings.'}
                </p>
                <button
                  onClick={() => {
                    setEditingApt(null)
                    setShowAptForm(true)
                  }}
                  className="mt-6 flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 sm:w-auto mx-auto max-w-xs"
                >
                  <Plus className="h-4 w-4" /> Create your first
                </button>
              </div>
            ) : (
              aptTypes.map((apt) => {
                const bookingUrl = cardHandle ? `${webUrl}/book/${cardHandle}/${apt.slug}` : null
                const busy = deletingAppointmentTypeId === apt.id
                return (
                  <div key={apt.id} className="group relative flex flex-col gap-4 rounded-[32px] border border-white/40 bg-white/40 p-6 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:bg-white/60 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:border-white/80 ring-1 ring-black/5 hover:ring-black/10">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="flex w-full min-w-0 items-start gap-4 sm:w-auto sm:flex-1">
                        <div
                          className="mt-0.5 h-12 w-12 flex-shrink-0 rounded-[18px] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_8px_16px_-6px_rgba(0,0,0,0.15)] ring-1 ring-black/5 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3"
                          style={{ background: apt.color }}
                        />
                        <div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <h3 className="truncate text-[17px] font-extrabold text-slate-900">{apt.name}</h3>
                            {!apt.isActive && (
                              <span className="flex items-center gap-1.5 rounded-full bg-slate-100/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-inset ring-slate-500/20">
                                Inactive
                              </span>
                            )}
                          </div>
                          {apt.description && (
                            <p className="mt-0.5 text-sm text-slate-500">{apt.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
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
                            <span className="text-slate-400">{apt._count.bookings} bookings</span>
                            <span className="text-slate-400">{apt.timezone}</span>
                          </div>
                          {/* Availability summary */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {ALL_DAYS.map((d) => {
                              const windows = apt.availabilityRules.filter((r) => r.dayOfWeek === d)
                              return (
                                <span
                                  key={d}
                                  className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider transition-colors ${windows.length > 0 ? 'bg-sky-100/50 text-sky-600 ring-1 ring-inset ring-sky-500/20' : 'bg-slate-50 text-slate-400'}`}
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
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {bookingUrl && (
                          <button
                            title="Copy booking link"
                            onClick={() => {
                              void copyToClipboard(bookingUrl).then((ok) => {
                                if (ok) showToast('Link copied!')
                                else showToast('Failed to copy link', false)
                              })
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-sky-50 hover:text-sky-600 active:scale-95"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          title="Edit questions"
                          onClick={() => setQuestionsEditorFor(apt)}
                          disabled={busy || deletingAppointmentTypeId !== null}
                          className="flex h-9 items-center justify-center rounded-xl bg-slate-50 px-3 text-[13px] font-bold text-slate-500 transition-all hover:bg-purple-50 hover:text-purple-600 active:scale-95 disabled:opacity-50"
                        >
                          Questions{apt.questions.length > 0 ? ` (${apt.questions.length})` : ''}
                        </button>
                        <button
                          title="Edit availability"
                          onClick={() => openAvailabilityFor(apt)}
                          disabled={busy || deletingAppointmentTypeId !== null}
                          className="flex h-9 items-center justify-center rounded-xl bg-slate-50 px-3 text-[13px] font-bold text-slate-500 transition-all hover:bg-sky-50 hover:text-sky-600 active:scale-95 disabled:opacity-50"
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
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-sky-50 hover:text-sky-600 active:scale-95 disabled:opacity-50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => setConfirmState({ type: 'appointment-type', id: apt.id })}
                          disabled={busy || deletingAppointmentTypeId !== null}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {bookingUrl && (
                      <div className="mt-3 flex items-center justify-between gap-2 overflow-hidden rounded-[20px] bg-slate-50 shadow-inner px-4 py-2 border border-slate-100">
                        <span className="truncate font-mono text-xs text-slate-500">
                          {bookingUrl}
                        </span>
                        <button
                          onClick={() => {
                            void copyToClipboard(bookingUrl).then((ok) => {
                              if (ok) showToast('Link copied!')
                              else showToast('Failed to copy link', false)
                            })
                          }}
                          className="flex shrink-0 h-6 w-6 items-center justify-center rounded-md bg-white text-slate-400 shadow-sm hover:text-sky-600 transition-colors active:scale-95"
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
              <p className="text-sm font-medium text-slate-500 sm:text-base">
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
                  <Calendar className="mx-auto mb-6 h-20 w-20 text-sky-400 opacity-80 drop-shadow-sm" />
                  <p className="text-xl font-extrabold text-slate-900 mb-2">No upcoming bookings.</p>
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
                            <div className="font-medium text-slate-900">{b.guestName}</div>
                            <div className="text-slate-400">{b.guestEmail}</div>
                          </td>
                          <td>
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                style={{ background: b.appointmentType.color }}
                              />
                              {b.appointmentType.name}
                            </div>
                          </td>
                          <td className="text-xl font-extrabold text-slate-900 mb-2">{formatDateTimeFull(b.startAt, userTz)}</td>
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
