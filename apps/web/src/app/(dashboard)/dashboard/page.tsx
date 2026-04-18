import type { JSX } from 'react'
import { apiGet } from '@/lib/api'
import { getServerUserAndTokenOrRedirect } from '@/lib/server-auth'
import Link from 'next/link'

interface RecentActivityData {
  recentViews: number
  recentChats: number
}

interface RevenueDashboardData {
  plan: string
  totalRevenue: number
  totalPayments: number
  thisMonthRevenue: number
  totalLeads: number
  totalBookings: number
  conversion: {
    views: number
    whatsapp: number
    booking: number
    payment: number
  }
  pipeline: {
    new: number
    contacted: number
    booked: number
    paid: number
    lost: number
  }
  usage: {
    monthlyLeadCount: number
    monthlyLeadLimit: number | null
    monthlyBookingCount: number
    monthlyBookingLimit: number | null
    leadLimitReached: boolean
    bookingLimitReached: boolean
    paymentsLocked: boolean
    showBranding: boolean
  }
}

interface PaymentHistoryItem {
  id: string
  amount: number
  status: string
  createdAt: string
}

function formatRate(numerator: number, denominator: number): string {
  if (denominator <= 0) return '0%'
  return `${Math.round((numerator / denominator) * 100)}%`
}

function getDashboardNudge(data: RevenueDashboardData): string {
  if (data.totalLeads === 0) {
    return 'Share your link to start getting leads.'
  }

  if (data.totalLeads > 0 && data.conversion.whatsapp === 0) {
    return 'You have leads but no chats yet. Try updating your CTA copy.'
  }

  if (data.conversion.whatsapp > 0 && data.conversion.booking === 0) {
    return 'You have chats but no bookings yet. Add booking to convert interest into meetings.'
  }

  if (data.conversion.booking > 0 && data.conversion.payment === 0) {
    return 'You have bookings but no payments yet. Add a payment option to close faster.'
  }

  return 'Your funnel is moving. Keep sharing the link that is converting best.'
}

function Card({ title, value, subcopy }: { title: string; value: string; subcopy?: string }) {
  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-gray-950">{value}</p>
      {subcopy ? <p className="mt-2 text-sm text-gray-500">{subcopy}</p> : null}
    </div>
  )
}

export default async function DashboardPage(): Promise<JSX.Element> {
  const { user, token } = await getServerUserAndTokenOrRedirect('/auth')

  if (!user.username) {
    return (
      <div className="rounded-[28px] border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
        Set a username to see revenue visibility.
      </div>
    )
  }

  const [dashboard, payments, activity] = await Promise.all([
    apiGet<RevenueDashboardData>(`/dashboard/${encodeURIComponent(user.username)}`, token),
    apiGet<PaymentHistoryItem[]>(`/payments/${encodeURIComponent(user.username)}`, token),
    apiGet<RecentActivityData>(`/activity/${encodeURIComponent(user.username)}`, token),
  ])

  const nudge = getDashboardNudge(dashboard)
  const isFreePlan = user.plan === 'FREE'

  return (
    <div className="space-y-6">
      {isFreePlan ? (
        <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-900">Free Plan</p>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Upgrade to Pro to unlock payments, unlimited leads, full dashboard access, and
                remove Dotly branding.
              </p>
              <p className="mt-2 text-xs text-emerald-700">
                {dashboard.totalLeads > 0
                  ? `You have ${dashboard.totalLeads} interested leads. Upgrade to convert them.`
                  : 'Start free, then upgrade when your link starts converting.'}
              </p>
            </div>
            <Link
              href="/upgrade"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Upgrade to Pro
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-[32px] border border-gray-200 bg-[linear-gradient(135deg,#0f172a_0%,#111827_55%,#1e293b_100%)] p-6 text-white shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Revenue Visibility
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          You earned {dashboard.totalRevenue} using Dotly
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Revenue is visible first, so you can instantly see what Dotly is helping you close.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card
            title="Total Revenue"
            value={`${dashboard.totalRevenue}`}
            subcopy={`${dashboard.totalPayments} successful payment${dashboard.totalPayments === 1 ? '' : 's'}`}
          />
          <Card
            title="This Month"
            value={`${dashboard.thisMonthRevenue}`}
            subcopy="Revenue collected this month"
          />
          <Card
            title="Total Leads"
            value={`${dashboard.totalLeads}`}
            subcopy={
              dashboard.usage.monthlyLeadLimit
                ? `${dashboard.usage.monthlyLeadCount}/${dashboard.usage.monthlyLeadLimit} used this month`
                : 'People who entered your funnel'
            }
          />
          <Card
            title="Bookings"
            value={`${dashboard.totalBookings}`}
            subcopy={
              dashboard.usage.monthlyBookingLimit
                ? `${dashboard.usage.monthlyBookingCount}/${dashboard.usage.monthlyBookingLimit} used this month`
                : 'Meetings created from your link'
            }
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-950">Live Signals</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <p className="rounded-2xl bg-gray-50 px-4 py-3">
              🔥 {activity.recentViews} people viewed your link in the last hour
            </p>
            <p className="rounded-2xl bg-gray-50 px-4 py-3">
              💬 {activity.recentChats} people started a chat in the last hour
            </p>
          </div>
        </div>

        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-amber-950">Next Best Nudge</h2>
          <p className="mt-4 text-sm leading-6 text-amber-900">{nudge}</p>
          {isFreePlan ? (
            <p className="mt-3 text-sm leading-6 text-amber-900">
              Upgrade to Pro to capture more leads, accept payments, and remove Dotly branding.
            </p>
          ) : null}
        </div>
      </section>

      {isFreePlan && (dashboard.usage.leadLimitReached || dashboard.usage.bookingLimitReached) ? (
        <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-rose-950">
                You’ve reached your free limit
              </h2>
              <p className="mt-2 text-sm text-rose-900">
                You’re getting attention. Upgrade to capture more leads, keep bookings open, and
                start earning.
              </p>
            </div>
            <Link
              href="/upgrade"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              Upgrade Now
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-950">Conversion Funnel</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span>Views</span>
              <span className="font-semibold text-gray-950">{dashboard.conversion.views}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span>Chats</span>
              <span className="font-semibold text-gray-950">{dashboard.conversion.whatsapp}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900">
              <span>Chat Rate</span>
              <span className="font-semibold">
                {formatRate(dashboard.conversion.whatsapp, dashboard.conversion.views)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span>Bookings</span>
              <span className="font-semibold text-gray-950">{dashboard.conversion.booking}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900">
              <span>Booking Rate</span>
              <span className="font-semibold">
                {formatRate(dashboard.conversion.booking, dashboard.conversion.whatsapp)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span>Payments</span>
              <span className="font-semibold text-gray-950">{dashboard.conversion.payment}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900">
              <span>Payment Rate</span>
              <span className="font-semibold">
                {formatRate(dashboard.conversion.payment, dashboard.conversion.booking)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-950">Pipeline</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span>New</span>
              <span className="font-semibold text-gray-950">{dashboard.pipeline.new}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span>Contacted</span>
              <span className="font-semibold text-gray-950">{dashboard.pipeline.contacted}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span>Booked</span>
              <span className="font-semibold text-gray-950">{dashboard.pipeline.booked}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span>Paid</span>
              <span className="font-semibold text-gray-950">{dashboard.pipeline.paid}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span>Lost</span>
              <span className="font-semibold text-gray-950">{dashboard.pipeline.lost}</span>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-950">Payment History</h2>
          <div className="mt-4 space-y-3">
            {dashboard.usage.paymentsLocked ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                Start earning by upgrading to Pro. Payments and the full revenue dashboard unlock on
                paid plans.
                <div className="mt-3">
                  <Link
                    href="/upgrade"
                    className="font-semibold text-amber-950 underline underline-offset-4"
                  >
                    Upgrade to Pro
                  </Link>
                </div>
              </div>
            ) : payments.length ? (
              payments.slice(0, 8).map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-gray-950">{payment.amount}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase text-gray-700 ring-1 ring-inset ring-gray-200">
                      {payment.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {new Date(payment.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No payments yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
