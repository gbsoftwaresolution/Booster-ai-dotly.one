const fs = require('fs')
const p = 'apps/web/src/app/(dashboard)/email-signature/components.tsx'
let c = fs.readFileSync(p, 'utf8')

// Header
c = c.replace(
  /<div className="app-panel rounded-\[30px\] px-6 py-6 sm:px-8">/,
  `<div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/60 px-6 py-8 sm:px-10 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.15)]">
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-[40px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-brand-400/10 blur-[40px] pointer-events-none" />`
)
c = c.replace(/<h1 className="text-2xl font-bold text-gray-900">/, '<h1 className="relative text-3xl font-extrabold tracking-tight text-slate-800">')
c = c.replace(/<p className="mt-2 text-sm text-gray-500">/, '<p className="relative mt-3 text-[15px] font-medium text-slate-500">')

// Titles in controls and previews
c = c.replace(/<h2 className="mb-3 text-sm font-semibold text-gray-700">/g, '<h2 className="mb-4 text-[13px] font-extrabold uppercase tracking-widest text-slate-400 ml-1">')
c = c.replace(/<h2 className="mb-4 text-sm font-semibold text-gray-700">/, '<h2 className="mb-6 text-[13px] font-extrabold uppercase tracking-widest text-slate-400 ml-1">')

// Control panels
c = c.replace(/className="app-panel rounded-\[24px\] p-5"/g, 'className="relative rounded-[32px] border border-white/80 bg-white/60 p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)] hover:bg-white"')

// Style Option Buttons
c = c.replace(/className=\{\[\n\s*'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors',\n\s*style === styleOption.value\n\s*\? 'border-indigo-500 bg-indigo-50 text-indigo-700'\n\s*: 'border-gray-200 text-gray-700 hover:bg-gray-50',\n\s*\]\.join\(' '\)\}/g,
`className={[
                'group relative flex w-full items-center justify-between rounded-[20px] border px-5 py-4 text-left transition-all duration-300 ease-out',
                style === styleOption.value
                  ? 'border-brand-300 bg-brand-50/80 shadow-[0_8px_24px_-8px_rgba(14,165,233,0.25)] scale-[1.02] ring-2 ring-brand-500/20'
                  : 'border-white/80 bg-white/40 hover:bg-white hover:border-white hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.08)] hover:-translate-y-0.5',
              ].join(' ')}`)

c = c.replace(/<span className="font-medium">\{styleOption.label\}<\/span>/g, '<span className={cn("text-[15px] font-bold tracking-tight transition-colors", style === styleOption.value ? "text-brand-700" : "text-slate-700 group-hover:text-slate-900")}>{styleOption.label}</span>')
c = c.replace(/<span className="text-xs text-gray-400">\{styleOption.desc\}<\/span>/g, '<span className={cn("text-[13px] font-medium transition-colors", style === styleOption.value ? "text-brand-500/80" : "text-slate-400")}>{styleOption.desc}</span>')

// Options checkboxes
c = c.replace(/className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/g, 'className="h-5 w-5 rounded-md border-gray-300 text-indigo-500 shadow-sm transition-all hover:border-indigo-400 hover:scale-110 focus:ring-indigo-500 focus:ring-offset-2"')
c = c.replace(/<span className="text-sm text-gray-700">\{label\}<\/span>/g, '<span className="text-[14px] font-bold text-slate-700 tracking-tight">{label}</span>')

// Action Buttons
c = c.replace(/className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2\.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"/,
'className="group relative flex w-full items-center justify-center gap-3 rounded-[24px] border-2 border-slate-200/60 bg-white/50 px-6 py-4 text-[15px] font-bold text-slate-600 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.05)] backdrop-blur-md transition-all duration-300 ease-out hover:border-slate-300/80 hover:bg-white hover:text-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.1)] hover:scale-[1.01] active:scale-95 disabled:pointer-events-none disabled:opacity-50"')
c = c.replace(/className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2\.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"/,
'className="group relative flex w-full items-center justify-center gap-3 rounded-[24px] bg-gradient-to-r from-sky-400 to-indigo-500 px-6 py-4 text-[15px] font-bold text-white shadow-[0_8px_32px_-8px_rgba(79,70,229,0.4)] transition-all duration-300 ease-out hover:shadow-[0_16px_48px_-12px_rgba(79,70,229,0.6)] hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50"')

// Preview Panel
c = c.replace(/<div className="app-panel rounded-\[28px\] p-6">/, '<div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/60 p-8 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.15)] lg:sticky lg:top-8">')
c = c.replace(/<div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6">/, '<div className="rounded-[24px] border-2 border-dashed border-slate-200/60 bg-white/40 p-8 shadow-inner transition-all duration-300 hover:bg-white/60">')

// Add cn to imports at the top if missing
if (!c.includes('cn }')) {
  c = c.replace(/import \{ Check, Copy, Mail \} from 'lucide-react'/, "import { Check, Copy, Mail } from 'lucide-react'\nimport { cn } from '@/lib/cn'")
}

fs.writeFileSync(p, c, 'utf8')
