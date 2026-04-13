const fs = require('fs')
const file = 'src/app/(dashboard)/deals/page.tsx'
let code = fs.readFileSync(file, 'utf8')

const oldHeaderRegex = /\{\/\* Header row \*\/\}\n\s*<div className="app-panel relative overflow-hidden rounded-\[28px\] px-6 py-6 sm:px-8 sm:py-7">[\s\S]*?<p className="mt-1 text-sm text-gray-600">\{focusMessage\}<\/p>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>/

const newHeader = `{/* Premium Header */}
      <div className="relative overflow-hidden rounded-[36px] bg-slate-900 px-8 py-12 shadow-2xl sm:px-10 sm:py-14 z-0">
        {/* Background glows */}
        <div className="absolute -left-10 top-0 h-64 w-64 rounded-full bg-indigo-600/30 blur-[80px]" />
        <div className="absolute -right-10 bottom-0 h-64 w-64 rounded-full bg-emerald-600/30 blur-[80px]" />
        <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 shadow-inner backdrop-blur-sm">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Sales Pipeline</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Active <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">Deals</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium text-slate-400 sm:text-base">
              Track revenue opportunities, keep stage movement clear, and stay focused on the deals most likely to close.
            </p>
          </div>
          
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {/* Quick Stats in Header */}
            <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pipeline Value</p>
                    <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold tracking-tight text-white">
                        {loading ? '—' : formatCurrency(totalPipelineValue, pipelineCurrency)}
                    </p>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Win Rate</p>
                    <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold tracking-tight text-white">
                        {loading ? '—' : winRate != null ? \`\${Math.round(winRate)}%\` : '—'}
                    </p>
                </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="group relative flex items-center gap-2 overflow-hidden rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-900 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-emerald-100 opacity-0 transition-opacity group-hover:opacity-100" />
              <Plus className="relative z-10 h-4 w-4" />
              <span className="relative z-10">New Deal</span>
            </button>
          </div>
        </div>
        
        {/* Pipeline Focus Message */}
        <div className="relative z-10 mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm shadow-inner backdrop-blur-md">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300">
                <Target className="h-3 w-3" />
            </span>
            <div className="min-w-0">
                <p className="font-semibold text-indigo-100">Pipeline focus</p>
                <p className="mt-0.5 text-[13px] text-indigo-200/80">{focusMessage}</p>
            </div>
        </div>
      </div>`

code = code.replace(oldHeaderRegex, newHeader)

// Replace the board
const oldBoardRegex = /\{DEAL_STAGES\.map\(\(stage\) => \([\s\S]*?<div\n\s*key=\{stage\}[\s\S]*?className="app-panel flex w-72 shrink-0 flex-col overflow-hidden rounded-\[24px\]"[\s\S]*?<\/div>\n\s*\)\)}/
const newBoardCode = `{DEAL_STAGES.map((stage) => (
            <div
              key={stage}
              className="relative flex w-[320px] shrink-0 flex-col overflow-hidden rounded-[32px] border border-white/80 bg-white/40 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)] backdrop-blur-xl"
            >
              {/* Stage header */}
              <div className="flex items-center justify-between border-b border-slate-100/50 bg-white/60 px-5 py-4 backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <span
                    className={\`h-2.5 w-2.5 rounded-full shadow-sm \${STAGE_HEADER_COLORS[stage]}\`}
                    aria-hidden="true"
                  />
                  <h3 className="font-bold text-slate-900">{STAGE_LABELS[stage]}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    {stageDeals[stage].total}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-slate-500">Value</p>
                  <p className="text-[13px] font-bold tracking-tight text-slate-900">
                    {formatCurrency(
                      stageDeals[stage].items.reduce((s, deal) => s + (deal.value ?? 0), 0),
                      pipelineCurrency,
                    )}
                  </p>
                </div>
              </div>

              {/* Stage content */}
              <div className="flex-1 overflow-y-auto p-4">
                {stageErrors[stage] ? (
                  <StatusNotice tone="warning" liveMode="polite" message={stageErrors[stage]} />
                ) : stageDeals[stage].items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/20 py-10 text-center">
                    <p className="text-sm font-medium text-slate-400">Empty stage</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {stageDeals[stage].items.map((deal) => {
                      const isBusy = busyDealIds.has(deal.id)
                      const contactName =
                        deal.contactName?.trim() || deal.contactEmail || 'Unnamed Contact'
                      return (
                        <li
                          key={deal.id}
                          className={cn(
                            'group relative flex flex-col gap-3 rounded-2xl border border-white/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-10px_rgba(15,23,42,0.12)]',
                            isBusy ? 'opacity-50 blur-[1px] grayscale-[20%]' : '',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-bold leading-tight text-slate-900 line-clamp-2">
                              {deal.title}
                            </p>
                            {/* Action menu triggers on hover layout */}
                            <div className="flex shrink-0 -translate-y-1 translate-x-1 items-center opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => setEditingDeal(deal)}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 focus-visible:opacity-100"
                                aria-label="Edit deal"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(deal.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100"
                                aria-label="Delete deal"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Contact */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDrawerContactId(deal.contactId)}
                              className="flex max-w-[180px] items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-indigo-500"
                            >
                              <span className="truncate">{contactName}</span>
                            </button>
                          </div>

                          {/* Value & Close Date */}
                          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Value
                              </span>
                              <span className="text-sm font-extrabold text-slate-900">
                                {formatCurrency(deal.value ?? 0, deal.currency ?? 'USD')}
                              </span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Close Target
                              </span>
                              <span className="text-xs font-semibold text-slate-700">
                                {deal.closeDate ? formatDate(deal.closeDate, userTz) : 'No date'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Stage Mover Selector */}
                          <div className="mt-1 pt-2">
                              <label htmlFor={\`stage-\${deal.id}\`} className="sr-only">Move stage</label>
                              <SelectField 
                                  id={\`stage-\${deal.id}\`}
                                  value={deal.stage}
                                  onChange={(e) => handleStageChange(deal, e.target.value as DealStage)}
                                  disabled={isBusy}
                                  className="w-full text-[11px] font-semibold py-1.5 h-auto rounded-lg bg-slate-50 border-transparent hover:bg-slate-100"
                              >
                                  {DEAL_STAGES.map(s => <option key={s} value={s}>Move to {STAGE_LABELS[s]}</option>)}
                              </SelectField>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          ))}`
code = code.replace(oldBoardRegex, newBoardCode)

// Enhance Search/Filters layout
code = code.replace(
  'className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"',
  'className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-white/40 p-2 shadow-sm border border-white/60 backdrop-blur-md"'
)

code = code.replace(
  'className="w-full rounded-xl border border-gray-300 py-2.5 pl-3 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-64"',
  'className="w-full rounded-[18px] border-none shadow-sm bg-white py-2.5 pl-4 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 sm:w-72"'
)

code = code.replace(
  'className="w-full rounded-xl px-3 py-2.5 pr-10 focus:border-indigo-500 focus:ring-indigo-100 sm:w-auto"',
  'className="w-full rounded-[18px] border-none shadow-sm bg-white px-4 py-2.5 pr-10 font-medium focus:ring-2 focus:ring-indigo-500/50 sm:w-auto"'
)

fs.writeFileSync(file, code, 'utf8')
