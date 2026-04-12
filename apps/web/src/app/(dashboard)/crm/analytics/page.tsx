'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { StatusNotice } from '@/components/ui/StatusNotice'
import { apiGet } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import type { PaginatedResponse } from '@dotly/types'

import {
  ContactFunnelSection,
  ConversionRatesSection,
  CrmAnalyticsHeader,
  DealRevenueSection,
  PipelineValueSection,
  SourceBreakdownSection,
} from './components'
import { buildDealStageSummaries, normalizeProbability } from './helpers'
import type { Deal, FunnelAnalyticsResponse } from './types'

export default function CrmAnalyticsPage(): JSX.Element {
  const [funnelData, setFunnelData] = useState<FunnelAnalyticsResponse | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const loadData = useCallback(
    async (from = dateFrom, to = dateTo) => {
      setLoading(true)
      setError(null)

      try {
        const token = await getAccessToken()
        const funnelParams = new URLSearchParams()
        if (from) funnelParams.set('dateFrom', from)
        if (to) funnelParams.set('dateTo', to)

        const funnelUrl = `/crm/analytics/funnel${funnelParams.toString() ? `?${funnelParams.toString()}` : ''}`
        const [funnel, dealsData] = await Promise.all([
          apiGet<FunnelAnalyticsResponse>(funnelUrl, token),
          apiGet<PaginatedResponse<Deal>>('/deals', token),
        ])

        setFunnelData(funnel)
        setDeals(dealsData.items)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    },
    [dateFrom, dateTo],
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  const funnelMaxCount = useMemo(
    () => Math.max(...(funnelData?.stages.map((stage) => stage.count) ?? [0]), 1),
    [funnelData],
  )

  const dealCurrency = deals[0]?.currency ?? 'USD'
  const totalPipeline = useMemo(() => deals.reduce((sum, deal) => sum + deal.value, 0), [deals])
  const weightedPipeline = useMemo(
    () =>
      deals
        .filter((deal) => deal.stage !== 'CLOSED_LOST')
        .reduce((sum, deal) => sum + deal.value * normalizeProbability(deal.probability) * 0.01, 0),
    [deals],
  )
  const wonDeals = useMemo(() => deals.filter((deal) => deal.stage === 'CLOSED_WON'), [deals])
  const closedDeals = useMemo(
    () => deals.filter((deal) => deal.stage === 'CLOSED_WON' || deal.stage === 'CLOSED_LOST'),
    [deals],
  )
  const winRate = closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : null
  const avgWonDeal =
    wonDeals.length > 0
      ? wonDeals.reduce((sum, deal) => sum + deal.value, 0) / wonDeals.length
      : null

  const dealStageSummaries = useMemo(() => buildDealStageSummaries(deals), [deals])
  const maxDealStageValue = useMemo(
    () => Math.max(...dealStageSummaries.map((summary) => summary.value), 1),
    [dealStageSummaries],
  )

  return (
    <div className="space-y-8">
      <CrmAnalyticsHeader
        dateFrom={dateFrom}
        dateTo={dateTo}
        loading={loading}
        totalActive={funnelData?.totalActive ?? 0}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onApply={() => {
          void loadData(dateFrom, dateTo)
        }}
        onClear={() => {
          setDateFrom('')
          setDateTo('')
          void loadData('', '')
        }}
      />

      {error && (
        <StatusNotice
          message={error}
          action={
            <button
              type="button"
              onClick={() => void loadData()}
              className="font-semibold underline"
            >
              Retry
            </button>
          }
        />
      )}

      <DealRevenueSection
        loading={loading}
        dealCurrency={dealCurrency}
        totalPipeline={totalPipeline}
        weightedPipeline={weightedPipeline}
        winRate={winRate}
        wonDealsCount={wonDeals.length}
        closedDealsCount={closedDeals.length}
        avgWonDeal={avgWonDeal}
      />

      <PipelineValueSection
        loading={loading}
        dealsCount={deals.length}
        dealCurrency={dealCurrency}
        summaries={dealStageSummaries}
        maxValue={maxDealStageValue}
      />

      <ContactFunnelSection
        loading={loading}
        funnelData={funnelData}
        funnelMaxCount={funnelMaxCount}
      />

      <ConversionRatesSection loading={loading} funnelData={funnelData} />

      <SourceBreakdownSection sourceBreakdown={funnelData?.sourceBreakdown} />
    </div>
  )
}
