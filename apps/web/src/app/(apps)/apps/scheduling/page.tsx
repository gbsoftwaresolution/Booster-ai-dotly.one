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
  const fetchData = useCallback(async () => {
    try {
      const token = await getAccessToken()
      const [aptTypes, bookingsArr] = await Promise.all([
        apiGet<AppointmentType[]>('/scheduling/appointment-types', token).catch(() => []),
        apiGet<Booking[]>('/scheduling/bookings', token).catch(() => []),
      ])
      setAppointmentTypes(Array.isArray(aptTypes) ? aptTypes : [])
      setBookings(Array.isArray(bookingsArr) ? bookingsArr : [])
    } catch {
      // silently handled
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const upcomingBookings = bookings.filter(
    (b) =>
      (b.status === 'CONFIRMED' || b.status === 'confirmed') && new Date(b.startAt) > new Date(),
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="app-panel flex items-center justify-between rounded-[30px] px-6 py-6 sm:px-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduling</h1>
          <p className="mt-2 text-sm text-gray-500">
            Manage appointments, availability and bookings
          </p>
        </div>
        <Link
          href="/scheduling"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}
        >
          <Plus className="h-4 w-4" />
          New Appointment Type
        </Link>
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
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', color)}>
                  <Icon className="h-4 w-4 text-white" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Appointment types */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Appointment Types</h2>
          <Link href="/scheduling" className="text-xs font-medium text-emerald-600 hover:underline">
            Manage all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : appointmentTypes.length === 0 ? (
          <div className="app-empty-state">
            <CalendarCheck className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-sm font-semibold text-gray-900">No appointment types</p>
            <p className="mt-1 text-xs text-gray-400">
              Create your first bookable appointment type
            </p>
            <Link
              href="/scheduling"
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
        ) : upcomingBookings.length === 0 ? (
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
