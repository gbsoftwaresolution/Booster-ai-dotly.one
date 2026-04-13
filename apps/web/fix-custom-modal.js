const fs = require('fs')
const file = 'src/app/(dashboard)/crm/custom-fields/components.tsx'
let code = fs.readFileSync(file, 'utf8')

code = code.replace(
  /className="app-dialog-panel max-w-md"/g,
  'className="relative mx-auto w-full max-w-md my-8 rounded-[36px] bg-white/95 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"'
)

code = code.replace(
  /className="app-dialog-body-scroll p-6"/g,
  'className="app-dialog-body-scroll p-8"'
)

code = code.replace(
  /className="mb-5 text-lg font-bold text-gray-900"/g,
  'className="mb-8 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]"'
)

// Inputs and labels
code = code.replace(
  /className="mb-1 block text-sm font-medium text-gray-700"/g,
  'className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"'
)

code = code.replace(
  /className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/g,
  'className="w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20"'
)

code = code.replace(
  /className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"/g,
  'className="w-full appearance-none rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20"'
)

code = code.replace(
  /className="mt-1 text-sm text-gray-500"/g,
  'className="mt-2 text-sm text-slate-400"'
)

// Action buttons
code = code.replace(
  /className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t bg-white p-4 sm:p-6"/g,
  'className="sticky bottom-0 mt-8 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/50 p-6 backdrop-blur-md rounded-b-[36px]"'
)

code = code.replace(
  /className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"/g,
  'className="rounded-2xl px-6 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95"'
)

code = code.replace(
  /className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"/g,
  'className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-60"'
)

code = code.replace(
  /className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600"/g,
  'className="mb-6 rounded-2xl bg-rose-50/50 p-4 text-[13px] font-medium text-rose-600 ring-1 ring-inset ring-rose-500/20"'
)


fs.writeFileSync(file, code, 'utf8')
