'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, ArrowLeft, Loader2, FileText, CalendarDays, Activity } from 'lucide-react'
import Link from 'next/link'
import { apiGet } from '@/lib/api'
import { formatExpiryDate } from '../helpers'
import type { SubscriptionData } from '../types'
import { cn } from '@/lib/cn'

export default function TransactionHistoryPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBilling() {
      try {
        const token = window.localStorage.getItem('auth_token')
        if (!token) throw new Error('Not authenticated')

        const data = await apiGet<SubscriptionData>('/billing', token)
        setSubscription(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch transaction history')
      } finally {
        setLoading(false)
      }
    }
    void fetchBilling()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="mt-4 text-sm text-gray-500">Loading history…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[40px] border border-red-200/50 bg-white/40 p-8 pt-12 backdrop-blur-3xl shadow-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500">
           <ExternalLink className="h-5 w-5" />
        </div>
        <p className="mt-4 font-medium text-red-800">{error}</p>
        <Link href="/settings/billing" className="mt-6 inline-block text-sm font-semibold text-brand-500 hover:text-brand-600">
          Go back to Billing Dashboard
        </Link>
      </div>
    )
  }

  const expiryDate = formatExpiryDate(subscription?.currentPeriodEnd)

  return (
    <div className="space-y-8 sm:space-y-12 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-4 border-b border-gray-200/60 pb-6">
        <Link 
          href="/settings/billing" 
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-900 transition-all hover:bg-gray-50 shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Transaction History</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage your past billing transactions.</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] border border-white/60 bg-white/40 p-6 sm:p-10 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] ring-1 ring-black/5">
        
        {subscription?.txHash ? (
          <div className="flex flex-col gap-6">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-[24px] border border-white/80 bg-white/60 p-6 shadow-sm ring-1 ring-black/5">
                <div className="flex items-center gap-3 text-indigo-600 mb-3">
                  <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
                    <Activity className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold">Plan & Status</h3>
                </div>
                <div className="space-y-1 mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</p>
                  <p className="text-[15px] font-bold text-gray-900">{subscription.plan}</p>
                </div>
                <div className="space-y-1 mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</p>
                  <span className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                    subscription.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
                  )}>
                    {subscription.status}
                  </span>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/60 p-6 shadow-sm ring-1 ring-black/5">
                <div className="flex items-center gap-3 text-sky-600 mb-3">
                  <div className="p-2 rounded-xl bg-sky-50 border border-sky-100">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold">Renewal details</h3>
                </div>
                {expiryDate ? (
                  <div className="space-y-1 mt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current period ends</p>
                    <p className="text-[15px] font-bold text-gray-900">{expiryDate}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mt-4">No renewal active</p>
                )}
                 {subscription.amountUsdt && (
                  <div className="space-y-1 mt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</p>
                    <p className="text-[15px] font-bold text-gray-900">${subscription.amountUsdt} USD</p>
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/60 p-6 shadow-sm ring-1 ring-black/5">
                <div className="flex items-center gap-3 text-brand-600 mb-3">
                  <div className="p-2 rounded-xl bg-brand-50 border border-brand-100">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold">Receipt & Block</h3>
                </div>
                <div className="space-y-1 mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Transaction Hash</p>
                  <p className="text-xs font-mono text-gray-600 truncate bg-gray-100/50 p-2 rounded-lg border border-gray-200/50 mt-1" title={subscription.txHash}>
                    {subscription.txHash}
                  </p>
                </div>
                <a
                  href={`https://arbiscan.io/tx/${subscription.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100/80 hover:text-brand-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Arbiscan
                </a>
              </div>
            </div>
            
            {subscription?.boosterAiOrderId && (
              <div className="flex border-t border-gray-200/50 pt-5 justify-between flex-wrap gap-4 items-center">
                <p className="text-xs font-medium text-gray-500">
                  Order ID: <span className="font-mono text-gray-800 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm max-w-[120px] sm:max-w-none inline-block align-bottom truncate" title={subscription.boosterAiOrderId}>{subscription.boosterAiOrderId}</span>
                </p>
                <div className="text-xs text-gray-400">
                  Processed securely via Web3 smart contracts
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-gray-300 bg-white/30 py-16 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100/80 text-gray-400 border border-white">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-base font-bold text-gray-900">No transactions to display</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
              We could not find any recent billing activity. Once you process a subscription, it will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
