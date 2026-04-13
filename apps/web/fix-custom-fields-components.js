const fs = require('fs')
const file = 'src/app/(dashboard)/crm/custom-fields/components.tsx'
let code = fs.readFileSync(file, 'utf8')

// The row itself
code = code.replace(
  /className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm"/g,
  'className="group relative flex items-center gap-4 rounded-[24px] border border-slate-200/60 bg-white/60 p-5 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:bg-white"'
)

// Label for field type
code = code.replace(
  /className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"/g,
  'className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] uppercase tracking-wider font-bold text-indigo-600 ring-1 ring-inset ring-indigo-500/20"'
)

// Label text
code = code.replace(
  /className="truncate font-semibold text-gray-900"/g,
  'className="truncate text-base font-bold text-slate-900"'
)

// Options tags
code = code.replace(
  /className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"/g,
  'className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200/50"'
)

// Edit / Delete buttons 
code = code.replace(
  /className="rounded p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"/g,
  'className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"'
)
code = code.replace(
  /className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"/g,
  'className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"'
)

// Confirm dialog panel
code = code.replace(
  /className="app-confirm-panel"/g,
  'className="relative mx-auto w-full max-w-sm rounded-[32px] bg-white/95 p-8 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"'
)
code = code.replace(
  /className="text-sm font-semibold text-gray-900"/g,
  'className="text-xl font-extrabold tracking-tight text-slate-900"'
)
code = code.replace(
  /className="mt-1 text-sm text-gray-600"/g,
  'className="mt-2 text-sm font-medium text-slate-500"'
)
code = code.replace(
  /className="app-touch-target rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"/g,
  'className="app-touch-target rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"'
)
code = code.replace(
  /className="app-touch-target rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"/g,
  'className="app-touch-target rounded-2xl bg-rose-500 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-rose-600 hover:shadow-lg"'
)

fs.writeFileSync(file, code, 'utf8')
