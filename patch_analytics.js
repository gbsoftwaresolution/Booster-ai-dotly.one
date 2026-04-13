const fs = require('fs')
const p = 'apps/web/src/app/(apps)/apps/cards/[id]/analytics/page.tsx'
let c = fs.readFileSync(p, 'utf8')

// StatCard Component
c = c.replace(/className="app-panel flex flex-col gap-3 rounded-\[24px\] p-4"/g, 'className="relative flex flex-col gap-4 rounded-[32px] border border-white/80 bg-white/60 p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:bg-white overflow-hidden group"')
c = c.replace(/<p className="text-xs font-semibold uppercase tracking-wider text-gray-400">\{label\}<\/p>/g, '<p className="text-[12px] font-extrabold uppercase tracking-widest text-slate-400 relative z-10 group-hover:text-brand-500 transition-colors duration-300">{label}</p>')
c = c.replace(/className=\{cn\('flex h-8 w-8 items-center justify-center rounded-xl', color\)\}/g, "className={cn('relative z-10 flex h-10 w-10 items-center justify-center rounded-[18px] shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3', color)}")
c = c.replace(/<p className="text-3xl font-extrabold tracking-tight text-gray-900">\{value\}<\/p>/g, '<p className="relative z-10 mt-1 text-[32px] font-black tracking-tight text-slate-800">{value}</p>')
c = c.replace(/<p className="text-xs text-gray-400">\{sub\}<\/p>/g, '<p className="relative z-10 text-[13px] font-bold text-slate-400 transition-colors group-hover:text-slate-500">{sub}</p>')

// Add decorative blur to StatCard
c = c.replace(/<Icon className="h-4 w-4" aria-hidden="true" \/>\n\s*<\/span>\n\s*<\/div>/, 
`<Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <div className={cn("absolute -bottom-8 -right-8 h-32 w-32 rounded-full blur-[32px] opacity-20 transition-opacity duration-500 group-hover:opacity-40 pointer-events-none", color.split(' ')[0])} />`)

// BarRow Component
c = c.replace(/className="flex items-center justify-between text-xs"/g, 'className="flex items-center justify-between text-[13px]"')
c = c.replace(/className="truncate max-w-\[60%\] font-medium text-gray-700"/g, 'className="truncate max-w-[65%] font-bold text-slate-700 tracking-tight"')
c = c.replace(/className="shrink-0 font-semibold text-gray-500"/g, 'className="shrink-0 font-extrabold text-slate-400"')
c = c.replace(/className="h-1\.5 w-full rounded-full bg-gray-100"/g, 'className="h-2 w-full rounded-full bg-slate-100/80 shadow-inner overflow-hidden"')
c = c.replace(/className="h-1\.5 rounded-full transition-all duration-500"/g, 'className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-white/0 after:via-white/30 after:to-white/0"')

// Main panels
c = c.replace(/className="app-panel flex items-center justify-between rounded-\[28px\] px-5 py-4"/g, 'className="relative flex items-center justify-between rounded-[32px] border border-white/80 bg-white/60 p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)]"')
c = c.replace(/className="app-panel rounded-\[28px\] p-5"/g, 'className="relative rounded-[32px] border border-white/80 bg-white/60 p-8 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)] hover:bg-white"')

// Range Selector
c = c.replace(/className="app-panel-subtle flex w-fit items-center gap-1 rounded-\[20px\] p-1\.5"/g, 'className="relative flex w-fit items-center gap-1.5 rounded-[24px] border border-white/60 bg-white/40 p-2 shadow-inner backdrop-blur-md"')
c = c.replace(/className=\{cn\(\n\s*'rounded-xl px-4 py-1\.5 text-xs font-semibold transition-all',\n\s*range\.label === r\.label\n\s*\? 'bg-sky-500 text-white shadow-sm'\n\s*: 'text-gray-500 hover:text-gray-700',\n\s*\)\}/g, 
`className={cn(
              'rounded-[18px] px-5 py-2 text-[13px] font-bold tracking-wide transition-all duration-300',
              range.label === r.label
                ? 'bg-white shadow-[0_4px_16px_-4px_rgba(15,23,42,0.1)] text-brand-600 border border-white'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent',
            )}`)

// Headings inside charts
c = c.replace(/<h3 className="text-sm font-bold text-gray-900">/g, '<h3 className="text-[17px] font-extrabold tracking-tight text-slate-800">')
c = c.replace(/<p className="text-xs text-gray-400">/g, '<p className="text-[13px] font-bold text-slate-400/80 mt-1">')

// Tooltip background in DayChart
c = c.replace(/className="absolute bottom-full mb-1\.5 left-1\/2 -translate-x-1\/2 z-10 whitespace-nowrap rounded-xl bg-gray-900 px-2\.5 py-1\.5 text-\[11px\] font-semibold text-white shadow-lg"/g, 'className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-[16px] border border-white/20 bg-slate-900/90 backdrop-blur-md px-3 py-2 text-[12px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] pointer-events-none"')

// Month axis labels
c = c.replace(/className="text-\[9px\] text-gray-300"/g, 'className="text-[10px] font-extrabold tracking-wider uppercase text-slate-300"')

fs.writeFileSync(p, c, 'utf8')
