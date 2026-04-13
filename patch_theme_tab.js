const fs = require('fs')
const p = 'apps/web/src/components/card-builder/ThemeTab.tsx'
let c = fs.readFileSync(p, 'utf8')

// SectionHeader replacement
c = c.replace(/<div className="flex items-center gap-3 pt-2">\n\s*<p className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">\n\s*\{label\}\n\s*<\/p>\n\s*<div className="h-px flex-1 bg-gray-100" \/>\n\s*<\/div>/g, 
`    <div className="flex items-center gap-3 pt-6 pb-2">
      <div className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
      <p className="text-[12px] font-extrabold text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap truncate">
        {label}
      </p>
      <div className="h-[2px] flex-1 bg-gradient-to-r from-slate-200/80 to-transparent rounded-full" />
    </div>`)

// Preset list grid
c = c.replace(/className="grid grid-cols-2 gap-3 sm:grid-cols-3"/g, 'className="grid grid-cols-2 gap-4 sm:grid-cols-3"')

c = c.replace(/className=\{cn\(\n\s*'group relative flex flex-col items-center gap-2 rounded-2xl border p-2 transition-all',\n\s*isActive\n\s*\? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'\n\s*: 'border-gray-200 bg-white hover:border-brand-200 hover:bg-gray-50',\n\s*\)\}/g,
`className={cn(
                  'group relative flex flex-col items-center gap-3 rounded-[32px] border border-white/80 p-4 transition-all duration-300 ease-out backdrop-blur-xl',
                  isActive
                    ? 'border-brand-300 bg-brand-50/80 shadow-[0_12px_32px_-12px_rgba(14,165,233,0.3)] scale-[1.02] ring-2 ring-brand-500/20'
                    : 'bg-white/60 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)] hover:bg-white hover:border-white hover:-translate-y-0.5',
                )}`)

// Preview circles for Presets
c = c.replace(/className="flex h-12 w-full shrink-0 flex-col overflow-hidden rounded-xl border border-gray-100"/g, 'className="flex h-16 w-full shrink-0 flex-col overflow-hidden rounded-2xl shadow-inner border border-black/5"')
c = c.replace(/className="h-1\/2 w-full"/g, 'className="h-1/2 w-full shadow-sm"')

c = c.replace(/<span\n\s*className=\{cn\(\n\s*'text-xs font-semibold',\n\s*isActive \? 'text-brand-700' : 'text-gray-600 group-hover:text-gray-900',\n\s*\)\}\n\s*>/g,
`<span
                  className={cn(
                    'text-[13px] font-bold tracking-tight transition-colors',
                    isActive ? 'text-brand-700' : 'text-gray-600 group-hover:text-gray-900',
                  )}
                >`)

// Custom Theme Controls 
c = c.replace(/className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4"/g, 'className="relative flex flex-col gap-3 rounded-[32px] border border-white/80 bg-white/60 p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)] hover:bg-white hover:border-white"')
c = c.replace(/<span className="text-sm font-semibold text-gray-700">/g, '<span className="text-[15px] font-bold text-gray-800 tracking-tight">')

// Standard generic UI
c = c.replace(/className="grid grid-cols-2 gap-3"/g, 'className="grid grid-cols-2 gap-4"')
c = c.replace(/className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-2 pr-4 transition-all focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500\/20 focus-within:ring-offset-2"/g, 
'className="relative z-10 flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/60 p-2 pr-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:bg-white/80 hover:border-white focus-within:!border-brand-300 focus-within:!bg-white focus-within:shadow-[0_16px_40px_-12px_rgba(14,165,233,0.3)] focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:scale-[1.02] focus-within:z-20"')

c = c.replace(/className="h-10 w-10 cursor-pointer rounded-xl border border-gray-200 p-0 transition-transform hover:scale-105 active:scale-95"/g, 'className="h-12 w-12 cursor-pointer rounded-[18px] border-2 border-white shadow-[0_4px_16px_-4px_rgba(15,23,42,0.15)] p-0 transition-transform duration-300 hover:scale-110 active:scale-90"')

c = c.replace(/className="flex-1 bg-transparent text-sm font-medium text-gray-800 outline-none"/g, 'className="flex-1 bg-transparent text-[14px] font-extrabold text-gray-800 tracking-wide uppercase outline-none"')

// Checkbox selector
c = c.replace(/className="mr-2 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"/g, 'className="mr-3 h-5 w-5 rounded-md border-gray-300 text-brand-500 shadow-sm transition-all hover:border-brand-400 hover:scale-110 focus:ring-brand-500 focus:ring-offset-2"')
c = c.replace(/className="text-sm font-medium text-gray-700"/g, 'className="text-[14px] font-bold text-gray-800 tracking-tight"')

fs.writeFileSync(p, c, 'utf8')
