const fs = require('fs')
const file = 'src/app/(dashboard)/pipelines/components.tsx'
let code = fs.readFileSync(file, 'utf8')

// Shell
code = code.replace(
  /className="app-dialog-shell"/g,
  'className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-md transition-all sm:p-6"'
)
code = code.replace(
  /className="app-dialog-panel max-w-lg"/g,
  'className="relative mx-auto w-full max-w-lg my-8 rounded-[36px] bg-white/95 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"'
)

// Header
code = code.replace(
  /className="flex items-center justify-between border-b border-gray-100 px-6 py-4"/g,
  'className="flex items-start justify-between border-b border-slate-100 px-8 py-6"'
)
code = code.replace(
  /className="text-xs font-semibold uppercase tracking-\[0\.22em\] text-sky-500\/80"/g,
  'className="text-[10px] font-bold uppercase tracking-wider text-sky-500"'
)
code = code.replace(
  /className="mt-1 text-lg font-bold text-gray-900"/g,
  'className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]"'
)
code = code.replace(
  /className="mt-1 text-sm text-gray-500"/g,
  'className="mt-2 max-w-sm text-sm font-medium text-slate-500"'
)
code = code.replace(
  /className="app-touch-target rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"/g,
  'className="app-touch-target flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"'
)

// Body
code = code.replace(
  /className="app-dialog-body-scroll px-6 py-4"/g,
  'className="app-dialog-body-scroll px-8 py-6 custom-scrollbar max-h-[60vh] overflow-y-auto"'
)
code = code.replace(
  /className="space-y-5"/g,
  'className="space-y-6"'
)

// Inputs & Labels
code = code.replace(
  /className="mb-1 block text-xs font-semibold text-gray-500"/g,
  'className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"'
)
code = code.replace(
  /className="text-xs font-semibold text-gray-500"/g,
  'className="text-[13px] font-bold uppercase tracking-wider text-slate-500"'
)

code = code.replace(
  /className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"/g,
  'className="w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-sky-500 focus:bg-white focus:ring-[3px] focus:ring-sky-500/20"'
)

// Add stage button
code = code.replace(
  /className="app-touch-target inline-flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700"/g,
  'className="app-touch-target inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-sky-600 transition-colors hover:bg-sky-100 ring-1 ring-inset ring-sky-500/20"'
)

// Stage form inputs
code = code.replace(
  /className="flex-1 rounded-lg border border-gray-200 px-3 py-1\.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"/g,
  'className="flex-1 rounded-xl border border-slate-200/60 bg-slate-50/50 px-3 py-2.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-sky-500 focus:bg-white focus:ring-[3px] focus:ring-sky-500/20"'
)
code = code.replace(
  /className="h-8 w-8 cursor-pointer rounded border border-gray-200 p-0\.5"/g,
  'className="h-10 w-10 cursor-pointer rounded-xl border border-slate-200/60 bg-slate-50/50 p-1"'
)

// Helper text
code = code.replace(
  /className="mt-1\.5 text-xs text-gray-400"/g,
  'className="mt-2 text-[13px] font-medium text-slate-400"'
)

// Checkbox text
code = code.replace(
  /className="rounded border-gray-300 text-sky-500 focus:ring-sky-400"/g,
  'className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-500 focus:ring-sky-500"'
)
code = code.replace(
  /className="text-sm text-gray-700"/g,
  'className="text-[15px] font-bold text-slate-700"'
)

// Footer
code = code.replace(
  /className="app-dialog-footer"/g,
  'className="sticky bottom-0 mt-4 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/50 p-6 backdrop-blur-md rounded-b-[36px]"'
)
code = code.replace(
  /className="app-touch-target w-full rounded-lg border border-gray-200 px-4 py-2\.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"/g,
  'className="w-full rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 sm:w-auto active:scale-95"'
)
code = code.replace(
  /className="app-touch-target w-full rounded-lg bg-sky-500 px-4 py-2\.5 text-sm font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-50 sm:w-auto"/g,
  'className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-sky-500 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-sky-600 hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"'
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
