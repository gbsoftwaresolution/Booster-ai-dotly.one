const fs = require('fs')
const p = 'apps/web/src/components/card-builder/LeadFormTab.tsx'
let c = fs.readFileSync(p, 'utf8')

// SectionLabel replacement
c = c.replace(
  /function SectionLabel\(\{ children \}: \{ children: React\.ReactNode \}\) \{\n\s*return \(\n\s*<p className="text-\[11px\] font-semibold uppercase tracking-widest text-gray-400 mb-2">\n\s*\{children\}\n\s*<\/p>\n\s*\)/g,
  `function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-6 pb-2">
      <div className="h-2 w-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
      <p className="text-[12px] font-extrabold text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap truncate">
        {children}
      </p>
      <div className="h-[2px] flex-1 bg-gradient-to-r from-slate-200/80 to-transparent rounded-full" />
    </div>
  )`
)

// TextInput replacement
c = c.replace(/className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500\/10"/g, 
'className="w-full rounded-[20px] border border-white/80 bg-white/60 px-4 py-3 text-[15px] font-medium text-gray-900 placeholder-gray-400 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] backdrop-blur-xl outline-none transition-all duration-300 ease-out focus:border-emerald-300 focus:bg-white focus:shadow-[0_16px_40px_-12px_rgba(16,185,129,0.25)] focus:ring-4 focus:ring-emerald-500/10 focus:scale-[1.01]"')

c = c.replace(/className="block text-\[11px\] font-semibold uppercase tracking-wide text-gray-400 mb-1\.5"/g, 'className="block text-[12px] font-extrabold uppercase tracking-widest text-gray-400 mb-2 ml-1"')

// FieldTypeSelect replacement
c = c.replace(/className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 pr-8 text-sm text-gray-900 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500\/10"/g, 
'className="w-full appearance-none rounded-[20px] border border-white/80 bg-white/60 px-4 py-3 pr-10 text-[15px] font-medium text-gray-900 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] backdrop-blur-xl outline-none transition-all duration-300 ease-out focus:border-emerald-300 focus:bg-white focus:shadow-[0_16px_40px_-12px_rgba(16,185,129,0.25)] focus:ring-4 focus:ring-emerald-500/10 focus:scale-[1.01]"')

// app-panel replacement for fields and form settings
c = c.replace(/className="app-panel rounded-\[24px\] overflow-hidden"/g, 'className="relative rounded-[32px] border border-white/80 bg-white/60 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)] hover:bg-white"')
c = c.replace(/className="app-panel rounded-\[28px\] p-4 flex flex-col gap-3"/g, 'className="relative rounded-[32px] border border-white/80 bg-white/60 p-6 flex flex-col gap-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)] hover:bg-white"')

// textareas
c = c.replace(/className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500\/10 resize-none"/g, 
'className="w-full rounded-[24px] border border-white/80 bg-white/60 px-5 py-4 text-[15px] font-medium text-gray-900 placeholder-gray-400 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] backdrop-blur-xl outline-none transition-all duration-300 ease-out focus:border-emerald-300 focus:bg-white focus:shadow-[0_16px_40px_-12px_rgba(16,185,129,0.25)] focus:ring-4 focus:ring-emerald-500/10 focus:scale-[1.01] resize-none"')

// Expand border and toggles
c = c.replace(/className="border-t border-gray-100 bg-gray-50\/60 px-3 py-3 flex flex-col gap-3"/g, 'className="border-t border-white/60 bg-white/40 px-5 py-5 flex flex-col gap-5"')

c = c.replace(/<span className="text-sm font-medium text-gray-700">Required<\/span>/g, '<span className="text-[14px] font-bold text-gray-800 tracking-tight">Required</span>')
c = c.replace(/className=\{cn\(\n\s*'h-5 w-9 rounded-full transition-colors duration-200',\n\s*field\.required \? 'bg-brand-500' : 'bg-gray-200',\n\s*\)\}/g, 
`className={cn(
                  'h-6 w-11 rounded-full transition-colors duration-300 shadow-inner',
                  field.required ? 'bg-emerald-500' : 'bg-gray-200',
                )}`)
c = c.replace(/className=\{cn\(\n\s*'absolute top-0\.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200',\n\s*field\.required \? 'left-\[18px\]' : 'left-0\.5',\n\s*\)\}/g,
`className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.2)] transition-all duration-300',
                  field.required ? 'left-[22px]' : 'left-0.5',
                )}`)

// Add field button
c = c.replace(/className="app-button flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50\/50 py-3 text-sm font-semibold text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"/g, 
'className="group relative flex w-full items-center justify-center gap-3 rounded-[32px] border-2 border-dashed border-emerald-200 bg-emerald-50/30 py-5 text-[15px] font-bold text-emerald-600 transition-all duration-300 hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700 hover:shadow-[0_8px_30px_-8px_rgba(16,185,129,0.2)] hover:scale-[1.01]"')

fs.writeFileSync(p, c, 'utf8')
