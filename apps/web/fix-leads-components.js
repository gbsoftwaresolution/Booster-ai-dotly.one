const fs = require('fs')
const file = 'src/app/(dashboard)/leads/components.tsx'
let code = fs.readFileSync(file, 'utf8')

// LeadsToolbar
code = code.replace(
  /className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"/g,
  'className="w-full rounded-2xl border border-slate-200/60 bg-white/60 py-3.5 pr-4 pl-12 text-sm font-medium text-slate-900 shadow-sm transition-all backdrop-blur-xl placeholder:text-slate-400 hover:bg-white focus:border-violet-500 focus:bg-white focus:ring-[3px] focus:ring-violet-500/20"'
)

// LeadsBulkActions
code = code.replace(
  /className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center"/g,
  'className="flex flex-col gap-4 rounded-2xl border border-rose-200/50 bg-rose-50/50 px-6 py-4 backdrop-blur-md shadow-sm sm:flex-row sm:flex-wrap sm:items-center"'
)
code = code.replace(
  /className="app-touch-target inline-flex items-center justify-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"/g,
  'className="app-touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider text-rose-600 shadow-sm ring-1 ring-inset ring-rose-200 transition-all hover:bg-rose-50 hover:shadow-md active:scale-95"'
)

// LeadsContent Empty State
code = code.replace(
  /className="py-12 text-center text-gray-500"/g,
  'className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/60 px-8 py-16 text-center backdrop-blur-xl shadow-sm transition-all m-4"'
)
code = code.replace(
  /<Inbox className="mx-auto h-12 w-12 text-gray-400" \/>/g,
  '<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-50 to-indigo-50/50 shadow-inner mb-6">\n          <Inbox size={32} className="text-violet-400" />\n        </div>'
)
code = code.replace(
  /<p className="mt-2 text-sm">/g,
  '<h3 className="text-xl font-extrabold text-slate-900 mb-2">No leads found</h3>\n        <p className="mx-auto max-w-sm text-sm font-medium text-slate-500 mb-8">'
)

// List View Items
code = code.replace(
  /className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3"/g,
  'className="group relative flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/60 p-5 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)]"'
)
code = code.replace(
  /className="rounded-full bg-indigo-100 px-2.5 py-1 font-medium text-indigo-700"/g,
  'className="rounded-full bg-violet-100/50 px-3 py-1 font-bold text-violet-700 ring-1 ring-inset ring-violet-500/20"'
)
code = code.replace(
  /className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600"/g,
  'className="rounded-full bg-slate-100/50 px-3 py-1 font-bold text-slate-600 ring-1 ring-inset ring-slate-500/10"'
)

// Details Box
code = code.replace(
  /className="rounded-2xl bg-gray-50\/90 p-3"/g,
  'className="rounded-2xl bg-slate-50/80 p-4 ring-1 ring-inset ring-slate-100"'
)
code = code.replace(
  /className="app-touch-target inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"/g,
  'className="app-touch-target inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider text-violet-600 shadow-sm ring-1 ring-inset ring-violet-200 transition-all hover:bg-violet-50 hover:shadow-md active:scale-95"'
)

// Table Headers
code = code.replace(
  /className="bg-gray-50"/g,
  'className="bg-slate-50/80 backdrop-blur-sm"'
)
code = code.replace(
  /className="hover:bg-gray-50"/g,
  'className="transition-colors hover:bg-slate-50/60"'
)
code = code.replace(
  /className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"/g,
  'className="inline-block rounded-full bg-violet-100/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-700 ring-1 ring-inset ring-violet-500/20"'
)

// Pagination
code = code.replace(
  /className="app-touch-target flex flex-1 items-center justify-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:flex-none"/g,
  'className="app-touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:flex-none"'
)

// Confirm Dialog
code = code.replace(
  /className="fixed inset-0 z-40 bg-black\/40"/g,
  'className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-md transition-all"'
)
code = code.replace(
  /className="app-confirm-panel relative z-50 w-full max-w-sm rounded-[32px] bg-white p-6 shadow-xl sm:p-8"/g,
  'className="relative z-50 mx-auto w-full max-w-sm rounded-[32px] bg-white/95 p-8 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60"'
)
code = code.replace(
  /className="app-touch-target rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"/g,
  'className="app-touch-target rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"'
)
code = code.replace(
  /className="app-touch-target rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"/g,
  'className="app-touch-target rounded-2xl bg-rose-500 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-rose-600 hover:shadow-lg"'
)
code = code.replace(
  /className="mb-1 text-lg font-bold text-gray-900"/g,
  'className="text-xl font-extrabold tracking-tight text-slate-900 mb-2"'
)
code = code.replace(
  /className="mb-6 text-sm text-gray-600"/g,
  'className="mb-6 text-sm font-medium text-slate-500"'
)

fs.writeFileSync(file, code, 'utf8')
