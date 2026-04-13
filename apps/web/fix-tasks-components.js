const fs = require('fs')
const file = 'src/app/(dashboard)/tasks/components.tsx'
let code = fs.readFileSync(file, 'utf8')

// Dialog styles
code = code.replace(
  /className="app-dialog-shell"/g,
  'className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-md transition-all sm:p-6"'
)
code = code.replace(
  /className="app-dialog-panel max-w-lg"/g,
  'className="relative mx-auto w-full max-w-lg my-8 rounded-[36px] bg-white/95 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"'
)
code = code.replace(
  /className="app-dialog-body-scroll p-6"/g,
  'className="max-h-[70vh] overflow-y-auto p-8 custom-scrollbar"'
)
code = code.replace(
  /className="text-lg font-bold text-gray-900 sm:text-xl"/g,
  'className="mb-6 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]"'
)

// Label formatting
code = code.replace(
  /className="mb-1 block text-sm font-medium text-gray-700"/g,
  'className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"'
)
code = code.replace(
  /className="block text-sm font-medium text-gray-700"/g,
  'className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"'
)
code = code.replace(
  /className="mb-1 block text-sm font-semibold text-gray-700"/g,
  'className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"'
)
code = code.replace(
  /className="block text-sm font-semibold text-gray-700"/g,
  'className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"'
)

// Input formatting
code = code.replace(
  /className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500\/50"/g,
  'className="w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20"'
)
code = code.replace(
  /className="min-h-\[100px\] w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500\/50"/g,
  'className="min-h-[120px] w-full resize-none rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20 custom-scrollbar"'
)
code = code.replace(
  /className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500\/50 disabled:bg-gray-50"/g,
  'className="w-full appearance-none rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20 disabled:opacity-60"'
)

// The combo box (contact dropdown) styling 
code = code.replace(
  /className="absolute left-0 right-0 top-full z-10 mt-2 max-h-60 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg"/g,
  'className="absolute left-0 right-0 top-full z-10 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-slate-200/60 bg-white/95 shadow-xl shadow-slate-200/50 backdrop-blur-xl"'
)
code = code.replace(
  /className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-gray-50"/g,
  'className="flex cursor-pointer items-center gap-3 p-3 transition-all hover:bg-slate-50 border-b border-slate-50 last:border-0"'
)

code = code.replace(
  /className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"/g,
  'className="w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20 pl-11"'
)

// Dialog Footer
code = code.replace(
  /className="sticky bottom-0 mt-6 flex flex-col-reverse gap-3 border-t bg-white p-4 sm:flex-row sm:justify-end sm:p-6"/g,
  'className="sticky bottom-0 mt-8 flex flex-col-reverse items-center justify-end gap-3 border-t border-slate-100 bg-white/50 p-6 backdrop-blur-md rounded-b-[36px] sm:flex-row"'
)
code = code.replace(
  /className="app-touch-target w-full rounded-lg border border-gray-300 px-4 py-2\.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"/g,
  'className="w-full rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 sm:w-auto active:scale-95"'
)
code = code.replace(
  /className="app-touch-target flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2\.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300 sm:w-auto"/g,
  'className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"'
)

// Close button (X)
code = code.replace(
  /className="app-touch-target rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"/g,
  'className="app-touch-target flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"'
)

// Date picker updates (Due Date inputs)
code = code.replace(
  /className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500\/50 mt-1 block"/g,
  'className="mt-1 block w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20"'
)

code = code.replace(
  /className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600"/g,
  'className="mb-6 rounded-2xl bg-rose-50/50 p-4 text-[13px] font-medium text-rose-600 ring-1 ring-inset ring-rose-500/20"'
)

// Confirm dialog panel
code = code.replace(
  /className="app-confirm-panel"/g,
  'className="relative mx-auto w-full max-w-sm rounded-[32px] bg-white/95 p-8 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"'
)

fs.writeFileSync(file, code, 'utf8')
