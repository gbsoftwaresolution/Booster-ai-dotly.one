const fs = require('fs')
const p = 'apps/web/src/app/(dashboard)/analytics/components.tsx'
let c = fs.readFileSync(p, 'utf8')

// Extract the original AnalyticsHero into AnalyticsHeroDesktop
const heroStartStr = 'export function AnalyticsHero({'
const heroDesktopStartStr = 'function AnalyticsHeroDesktop({'

const heroEndPattern = /          <\/div>\n        <\/div>\n      <\/div>\n    <\/div>\n  \)\n\}/
const match = c.match(heroEndPattern)

if (!match) {
  console.log("Could not find the end of AnalyticsHero")
  process.exit(1)
}

const endIndex = match.index + match[0].length
const beforeHero = c.slice(0, c.indexOf(heroStartStr))
const heroContent = c.slice(c.indexOf(heroStartStr), endIndex).replace('export function AnalyticsHero({', 'function AnalyticsHeroDesktop({')
const afterHero = c.slice(endIndex)

const wowMobileHero = `function AnalyticsHeroMobile({
  cards,
  cardsLoading,
  dashboardSummary,
  focusMessage,
  loading,
  selectedCardId,
  selectedCardLabel,
  selectedCardHandle,
  dateRangeDays,
  exporting,
  onSelectCard,
  onSelectRange,
  onRefresh,
  onExport,
}: {
  cards: CardSummary[]
  cardsLoading: boolean
  dashboardSummary: DashboardSummary | null
  focusMessage: string
  loading: boolean
  selectedCardId: string | null
  selectedCardLabel: string
  selectedCardHandle: string
  dateRangeDays: number
  exporting: boolean
  onSelectCard: (value: string) => void
  onSelectRange: (value: number) => void
  onRefresh: () => void
  onExport: () => void
}): JSX.Element {
  const metrics = [
    { label: 'Tracked', value: cardsLoading ? '—' : cards.length },
    { label: 'Active', value: cardsLoading ? '—' : (dashboardSummary?.activeCards ?? 0) },
    { label: 'Views', value: cardsLoading ? '—' : (dashboardSummary?.totalViews ?? 0) },
    { label: 'Leads', value: cardsLoading ? '—' : (dashboardSummary?.totalLeads ?? 0) },
  ]

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/60 p-5 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      {/* Decorative background glows */}
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-indigo-400/20 blur-[40px] pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-sky-400/20 blur-[40px] pointer-events-none" />

      {/* Header section */}
      <div className="relative mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/50 bg-indigo-50/80 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 shadow-sm backdrop-blur-md">
          <TrendingUp className="h-3 w-3" />
          Analytics
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-800 leading-[1.1]">
          See what is driving <br />
          <span className="bg-gradient-to-r from-indigo-500 to-sky-500 bg-clip-text text-transparent">performance.</span>
        </h1>
      </div>

      {/* Quick Metrics Grid */}
      <div className="relative mb-6 grid grid-cols-4 gap-2">
        {metrics.map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center justify-center rounded-[20px] border border-white/60 bg-white/40 py-3 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] backdrop-blur-md">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">{label}</p>
            <p className="mt-0.5 text-lg font-black text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Controls Area */}
      <div className="relative space-y-4 rounded-[24px] border-2 border-white/60 bg-white/40 p-4 shadow-inner backdrop-blur-lg">
        <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Context</p>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-indigo-600 shadow-[0_4px_12px_-4px_rgba(79,70,229,0.3)] transition-transform active:scale-90 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
        </div>

        {cards.length > 0 && (
          <SelectField
            value={selectedCardId ?? ''}
            onChange={(event) => onSelectCard(event.target.value)}
            aria-label="Select card"
            className="w-full rounded-[16px] border whitespace-nowrap overflow-hidden text-ellipsis border-white/80 bg-white/80 px-4 py-2.5 text-[14px] font-bold text-slate-700 shadow-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all"
          >
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                /{card.handle} {card.fields['name'] ? \`— \${card.fields['name']}\` : ''}
              </option>
            ))}
          </SelectField>
        )}

        {/* Date Ranges */}
        <div className="flex rounded-[16px] border border-white/60 bg-white/60 p-1 shadow-inner">
          {DATE_RANGE_OPTIONS.map((option) => (
            <button
              key={option.days}
              type="button"
              onClick={() => onSelectRange(option.days)}
              aria-pressed={dateRangeDays === option.days}
              className={cn(
                'flex-1 rounded-[12px] py-2 text-[13px] font-bold transition-all duration-300',
                dateRangeDays === option.days
                  ? 'bg-indigo-500 text-white shadow-[0_4px_16px_-4px_rgba(79,70,229,0.4)]'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Export Button */}
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="group relative flex w-full items-center justify-center gap-2 rounded-[16px] border-2 border-indigo-200/50 bg-indigo-50/50 px-4 py-3 text-[14px] font-bold text-indigo-700 transition-all hover:bg-white hover:border-indigo-300 hover:shadow-[0_8px_24px_-8px_rgba(79,70,229,0.2)] active:scale-[0.98] disabled:opacity-50 shadow-sm"
        >
          <Download className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
          {exporting ? 'Exporting…' : 'Export Leads CSV'}
        </button>
      </div>
    </div>
  )
}

export function AnalyticsHero(props: {
  cards: CardSummary[]
  cardsLoading: boolean
  dashboardSummary: DashboardSummary | null
  focusMessage: string
  loading: boolean
  selectedCardId: string | null
  selectedCardLabel: string
  selectedCardHandle: string
  dateRangeDays: number
  exporting: boolean
  onSelectCard: (value: string) => void
  onSelectRange: (value: number) => void
  onRefresh: () => void
  onExport: () => void
}): JSX.Element {
  return (
    <>
      <div className="hidden lg:block">
        <AnalyticsHeroDesktop {...props} />
      </div>
      <div className="block lg:hidden">
        <AnalyticsHeroMobile {...props} />
      </div>
    </>
  )
}
`

const finalCode = beforeHero + heroContent + '\n\n' + wowMobileHero + afterHero;
fs.writeFileSync(p, finalCode, 'utf8')
console.log("Success")
