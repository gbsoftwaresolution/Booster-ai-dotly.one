'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Calendar,
  CalendarCheck,
  Clock,
  CalendarClock,
  Plus,
  ArrowRight,
  Users,
  CreditCard,
  Zap,
} from 'lucide-react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { ItemsResponse } from '@dotly/types'

interface AppointmentType {
  id: string
  name: string
  slug: string
  durationMins: number
  isActive: boolean
}

interface Booking {
  id: string
  startAt: string
  endAt: string
  status: string
  guestName: string
  guestEmail: string
  appointmentTypeId: string
}

export default function SchedulingDashboard(): JSX.Element {
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const [aptTypes, bookingsArr] = await Promise.all([
        apiGet<ItemsResponse<AppointmentType>>('/scheduling/appointment-types', token),
        apiGet<ItemsResponse<Booking>>('/scheduling/bookings', token),
      ])
      setAppointmentTypes(Array.isArray(aptTypes.items) ? aptTypes.items : [])
      setBookings(Array.isArray(bookingsArr.items) ? bookingsArr.items : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scheduling data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const upcomingBookings = bookings
    .filter(
      (b) =>
        (b.status === 'CONFIRMED' || b.status === 'confirmed') && new Date(b.startAt) > new Date(),
    )
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  const activeAppointmentTypes = appointmentTypes.filter((apt) => apt.isActive)
  const nextBooking = upcomingBookings[0]
  const nextBookingDate = nextBooking ? new Date(nextBooking.startAt) : null
  const nextBookingName = nextBooking?.guestName ?? 'your next guest'
  const focusMessage = nextBookingDate
    ? `Next session with ${nextBookingName} at ${nextBookingDate.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}.`
    : activeAppointmentTypes.length > 0
      ? `${activeAppointmentTypes.length} appointment type${activeAppointmentTypes.length === 1 ? '' : 's'} are live and ready to book.`
      : 'Create your first appointment type to start accepting bookings.'

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => void fetchData()} className="ml-3 underline">
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <div className="app-panel relative overflow-hidden rounded-[34px] px-6 py-6 sm:px-8 sm:py-7">
        <div
          className="absolute inset-0 opacity-90"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(52,211,153,0.14), transparent 34%), radial-gradient(circle at right center, rgba(59,130,246,0.10), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(248,250,252,0.98))',
          }}
        />
        <div className="relative grid gap-5 xl:grid-cols-[1.3fr_0.9fr] xl:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">
              <CalendarCheck className="h-3.5 w-3.5" />
              Scheduling
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-[2rem]">
              Manage appointments, availability and bookings
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-[15px]">
              Keep your booking flow clear, spot what is coming next, and move between appointment
              setup and upcoming sessions faster.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">
              {[
                { label: 'Live Types', value: loading ? '—' : activeAppointmentTypes.length },
                { label: 'Total Bookings', value: loading ? '—' : bookings.length },
                { label: 'Upcoming', value: loading ? '—' : upcomingBookings.length },
                {
                  label: 'Next Session',
                  value: loading
                    ? '—'
                    : nextBookingDate
                      ? nextBookingDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })
                      : 'None',
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-[22px] border border-white/80 bg-white/85 px-3 py-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.2)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-gray-900 sm:text-base">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/apps/scheduling/appointment-types"
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-28px_rgba(5,150,105,0.45)] transition-transform hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}
              >
                <Plus className="h-4 w-4" />
                New Appointment Type
              </Link>
              <Link
                href="/apps/scheduling/bookings"
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <CalendarClock className="h-4 w-4 text-sky-500" />
                View Bookings
              </Link>
            </div>

            <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Clock className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">Focus: {focusMessage}</span>
            </div>
          </div>

          <div className="app-panel-subtle rounded-[30px] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Today At A Glance
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  Your booking operations snapshot
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 shadow-sm">
                Live
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                {
                  label: 'Upcoming sessions',
                  value: loading ? '—' : `${upcomingBookings.length}`,
                  detail: nextBookingDate
                    ? `${nextBookingName} is next on ${nextBookingDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`
                    : 'No upcoming bookings yet',
                  icon: CalendarClock,
                  tone: 'bg-sky-50 text-sky-600',
                },
                {
                  label: 'Appointment coverage',
                  value: loading ? '—' : `${activeAppointmentTypes.length}`,
                  detail:
                    activeAppointmentTypes.length > 0
                      ? 'Live appointment types accepting bookings'
                      : 'No active appointment types yet',
                  icon: CalendarCheck,
                  tone: 'bg-emerald-50 text-emerald-600',
                },
                {
                  label: 'Booking volume',
                  value: loading ? '—' : `${bookings.length}`,
                  detail:
                    bookings.length > 0
                      ? `${bookings.length - upcomingBookings.length} completed or past bookings tracked`
                      : 'No bookings collected yet',
                  icon: Users,
                  tone: 'bg-violet-50 text-violet-600',
                },
              ].map(({ label, value, detail, icon: Icon, tone }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/80 px-4 py-3"
                >
                  <span
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                      tone,
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {label}
                    </p>
                    <p className="truncate text-sm text-gray-500">{detail}</p>
                  </div>
                  <span className="shrink-0 text-lg font-bold tabular-nums text-gray-900">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {[
            {
              label: 'Appointment Types',
              value: appointmentTypes.length,
              icon: CalendarCheck,
              color: 'bg-emerald-500',
            },
            {
              label: 'Total Bookings',
              value: bookings.length,
              icon: CalendarClock,
              color: 'bg-sky-500',
            },
            {
              label: 'Upcoming',
              value: upcomingBookings.length,
              icon: Clock,
              color: 'bg-violet-500',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="app-panel rounded-[24px] p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', color)}>
                  <Icon className="h-4 w-4 text-white" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="mt-1 text-xs text-gray-400">
                {label === 'Appointment Types'
                  ? `${activeAppointmentTypes.length} currently live`
                  : label === 'Total Bookings'
                    ? 'All bookings tracked in one place'
                    : nextBookingDate
                      ? `Next starts ${nextBookingDate.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}`
                      : 'No confirmed bookings ahead'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Appointment types */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Appointment Types</h2>
          <Link
            href="/apps/scheduling/appointment-types"
            className="text-xs font-medium text-emerald-600 hover:underline"
          >
            Manage all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : error ? null : appointmentTypes.length === 0 ? (
          <div className="app-empty-state">
            <CalendarCheck className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-sm font-semibold text-gray-900">No appointment types</p>
            <p className="mt-1 text-xs text-gray-400">
              Create your first bookable appointment type
            </p>
            <Link
              href="/apps/scheduling/appointment-types"
              className="mt-4 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}
            >
              <Plus className="h-3.5 w-3.5" />
              Create Appointment Type
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {appointmentTypes.map((apt) => (
              <div key={apt.id} className="app-panel flex items-center gap-4 rounded-[24px] p-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}
                >
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{apt.name}</p>
                  <p className="text-xs text-gray-400">
                    {apt.durationMins} min
                    {' · Free'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      apt.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400',
                    )}
                  >
                    {apt.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming bookings */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Upcoming Bookings</h2>
          <Link
            href="/apps/scheduling/bookings"
            className="text-xs font-medium text-emerald-600 hover:underline"
          >
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : error ? null : upcomingBookings.length === 0 ? (
          <div className="app-empty-state">
            <CalendarClock className="h-8 w-8 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No upcoming bookings</p>
          </div>
        ) : (
          <div className="app-table-shell divide-y divide-gray-50 overflow-hidden">
            {upcomingBookings.slice(0, 5).map((b) => {
              const start = new Date(b.startAt)
              return (
                <div key={b.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex flex-col items-center w-10 shrink-0">
                    <span className="text-xs font-bold text-emerald-600 uppercase">
                      {start.toLocaleDateString('en', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold text-gray-900 leading-tight">
                      {start.getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{b.guestName}</p>
                    <p className="text-xs text-gray-400">
                      {start.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {b.guestEmail}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                    Confirmed
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Scheduling tools */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-900">Tools</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              href: '/apps/scheduling/appointment-types',
              label: 'Appointment Types',
              desc: 'Create and manage bookable slots',
              icon: CalendarCheck,
            },
            {
              href: '/apps/scheduling/availability',
              label: 'Availability',
              desc: 'Set your working hours',
              icon: Clock,
            },
            {
              href: '/apps/scheduling/bookings',
              label: 'All Bookings',
              desc: 'View and manage all bookings',
              icon: CalendarClock,
            },
          ].map(({ href, label, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="app-panel group flex items-center gap-3 rounded-[24px] p-4 transition-all hover:shadow-md"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 shrink-0">
                <Icon className="h-4 w-4 text-emerald-500" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-400 truncate">{desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>

      {/* Cross-app links */}
      <section className="app-panel-subtle rounded-[28px] border border-dashed border-gray-200 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Connected Apps
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/apps/cards"
            className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-sky-200 hover:text-sky-700"
          >
            <CreditCard className="h-4 w-4 text-sky-500" />
            Add booking link to your card
            <Zap className="h-3.5 w-3.5 text-sky-400" />
          </Link>
          <Link
            href="/apps/crm/contacts"
            className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-violet-200 hover:text-violet-700"
          >
            <Users className="h-4 w-4 text-violet-500" />
            View booked contacts in CRM
            <Zap className="h-3.5 w-3.5 text-violet-400" />
          </Link>
        </div>
      </section>
    </div>
  )
}
