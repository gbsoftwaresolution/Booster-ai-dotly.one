import type {
  BillingAdminRefundResponse,
  BillingRefundReviewItem,
  BillingRefundReviewListResponse,
} from '@dotly/types'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getServerApiUrl } from '@/lib/server-api'
import { getServerUserOrRedirect } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

const PAGE_PATH = '/internal/support/refunds'
const SUPPORT_COOKIE = 'dotly_support_ops'

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function shortHash(value: string | null): string {
  if (!value) return '—'
  return `${value.slice(0, 10)}...${value.slice(-8)}`
}

function getMessage(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value.trim()) return value
  if (Array.isArray(value) && value.length > 0) return value[0] ?? null
  return null
}

async function fetchRefundQueue(supportKey: string): Promise<{
  data: BillingRefundReviewListResponse | null
  error: string | null
}> {
  try {
    const accessTokenStore = await cookies()
    const accessToken = accessTokenStore.get('dotly_access_token')?.value
    if (!accessToken) {
      return { data: null, error: 'Your sign-in session expired. Sign in again to continue.' }
    }
    const response = await fetch(`${getServerApiUrl()}/billing/internal/refunds`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-dotly-support-ops-key': supportKey,
      },
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as
      | BillingRefundReviewListResponse
      | { message?: string | string[] }
      | null

    if (!response.ok) {
      return {
        data: null,
        error:
          getMessage(payload && 'message' in payload ? payload.message : undefined) ??
          'Failed to load refund queue',
      }
    }

    return {
      data: payload as BillingRefundReviewListResponse,
      error: null,
    }
  } catch {
    return { data: null, error: 'Failed to reach the billing API' }
  }
}

async function setSupportSession(formData: FormData) {
  'use server'

  const supportKey = String(formData.get('supportKey') ?? '').trim()
  if (!supportKey) {
    redirect(`${PAGE_PATH}?error=Support%20ops%20key%20is%20required`)
  }

  const cookieStore = await cookies()
  cookieStore.set(SUPPORT_COOKIE, supportKey, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  redirect(PAGE_PATH)
}

async function clearSupportSession() {
  'use server'

  const cookieStore = await cookies()
  cookieStore.delete(SUPPORT_COOKIE)
  redirect(PAGE_PATH)
}

async function runAdminRefund(formData: FormData) {
  'use server'

  const paymentId = String(formData.get('paymentId') ?? '').trim()
  const cookieStore = await cookies()
  const supportKey = cookieStore.get(SUPPORT_COOKIE)?.value
  const accessToken = cookieStore.get('dotly_access_token')?.value

  if (!supportKey || !accessToken) {
    redirect(`${PAGE_PATH}?error=Support%20session%20expired`)
  }

  const response = await fetch(`${getServerApiUrl()}/billing/internal/refunds/admin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'x-dotly-support-ops-key': supportKey,
    },
    body: JSON.stringify({ paymentId }),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as
    | BillingAdminRefundResponse
    | { message?: string | string[] }
    | null

  if (!response.ok) {
    const message = getMessage(payload && 'message' in payload ? payload.message : undefined)
    redirect(`${PAGE_PATH}?error=${encodeURIComponent(message ?? 'Admin refund failed')}`)
  }

  revalidatePath(PAGE_PATH)
  redirect(`${PAGE_PATH}?success=${encodeURIComponent(`Refunded ${shortHash(paymentId)}`)}`)
}

function StatusPill({ item }: { item: BillingRefundReviewItem }) {
  const refundStatus = item.refund?.status ?? 'NONE'
  const tone =
    refundStatus === 'REFUNDED'
      ? 'bg-emerald-100 text-emerald-700'
      : refundStatus === 'FINALIZED'
        ? 'bg-slate-200 text-slate-700'
        : refundStatus === 'PAID_ESCROW'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-rose-100 text-rose-700'

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{refundStatus}</span>
  )
}

export default async function InternalRefundQueuePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>
}) {
  await getServerUserOrRedirect(`/auth?next=${encodeURIComponent(PAGE_PATH)}`)
  const params = (await searchParams) ?? {}
  const cookieStore = await cookies()
  const supportKey = cookieStore.get(SUPPORT_COOKIE)?.value ?? null
  const queue = supportKey ? await fetchRefundQueue(supportKey) : { data: null, error: null }
  const error = params.error ?? queue.error
  const success = params.success ?? null

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-white/70 bg-white/85 p-8 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.28)] backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                Internal Support Queue
              </span>
              <div>
                <h1 className="text-3xl font-black tracking-tight">
                  Refund review and admin refund console
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Review manual refund requests, inspect payment status, and execute owner refunds
                  when the escrow window is still open.
                </p>
              </div>
            </div>

            {supportKey ? (
              <form action={clearSupportSession}>
                <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                  End support session
                </button>
              </form>
            ) : null}
          </div>

          {success ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {!supportKey ? (
            <form
              action={setSupportSession}
              className="mt-8 grid gap-4 rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white md:grid-cols-[1fr_auto] md:items-end"
            >
              <label className="block text-sm font-medium text-slate-200">
                Support ops key
                <input
                  type="password"
                  name="supportKey"
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
                  placeholder="Paste DOTLY_SUPPORT_OPS_KEY"
                />
              </label>
              <button className="rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300">
                Unlock queue
              </button>
            </form>
          ) : null}
        </section>

        {supportKey && queue.data ? (
          <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.22)] backdrop-blur">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black">Manual refund requests</h2>
                <p className="text-sm text-slate-600">
                  {queue.data.adminRefundEnabled
                    ? 'Owner-key admin refunds are available from this console.'
                    : 'Owner-key admin refunds are disabled until DOTLY_OWNER_PRIVATE_KEY is configured.'}
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                {queue.data.items.length} open request{queue.data.items.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="space-y-4">
              {queue.data.items.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                  No refund review requests have been logged yet.
                </div>
              ) : null}

              {queue.data.items.map((item) => (
                <article
                  key={item.requestId}
                  className="grid gap-5 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 lg:grid-cols-[1.4fr_0.9fr]"
                >
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusPill item={item} />
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        Requested {formatDateTime(item.requestedAt)}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        Plan {item.plan}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-950">
                        {item.userEmail ?? 'Unknown user'}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {item.userName ?? 'No display name'}
                        {item.userId ? ` • ${item.userId}` : ''}
                      </p>
                    </div>

                    <dl className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Payment ID
                        </dt>
                        <dd className="mt-1 font-mono text-xs text-slate-700">
                          {item.paymentId ?? 'Missing'}
                        </dd>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Checkout Tx
                        </dt>
                        <dd className="mt-1 font-mono text-xs text-slate-700">
                          {item.txHash ?? 'Missing'}
                        </dd>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Refund window
                        </dt>
                        <dd className="mt-1">{formatDateTime(item.refund?.refundUntil ?? null)}</dd>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Subscription state
                        </dt>
                        <dd className="mt-1">{item.subscriptionStatus ?? 'Unknown'}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex flex-col justify-between gap-4 rounded-[24px] bg-slate-950 p-5 text-white">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Support action
                      </p>
                      <h4 className="mt-2 text-lg font-bold">Admin refund</h4>
                      <p className="mt-2 text-sm text-slate-300">
                        {item.canAdminRefund
                          ? 'The refund is still in escrow and can be executed with the configured owner key.'
                          : item.refund?.status === 'REFUNDED'
                            ? 'Refund already completed.'
                            : 'This payment cannot be admin-refunded from the current state.'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200">
                        Last admin refund tx:{' '}
                        {item.adminRefundTxHash ? shortHash(item.adminRefundTxHash) : '—'}
                      </div>
                      <form action={runAdminRefund}>
                        <input type="hidden" name="paymentId" value={item.paymentId ?? ''} />
                        <button
                          disabled={!item.paymentId || !item.canAdminRefund}
                          className="w-full rounded-2xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                        >
                          Execute admin refund
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
