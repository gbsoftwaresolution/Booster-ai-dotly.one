const fs = require('fs')
const file = 'src/app/(dashboard)/deals/components.tsx'
let code = fs.readFileSync(file, 'utf8')

// Select & input updates globally for components.tsx
code = code.replace(
  /className="block text-sm font-semibold text-gray-700"/g,
  'className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"'
)

// Update input styling broadly
code = code.replace(
  /className="w-full rounded-xl border-gray-200 bg-gray-50\/50 px-4 py-3 text-sm text-gray-900 transition-colors placeholder:text-gray-400 hover:bg-gray-50 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500\/10"/g,
  'className="w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20"'
)
code = code.replace(
  /className="w-full appearance-none rounded-xl border-gray-200 bg-gray-50\/50 px-4 py-3 text-sm text-gray-900 transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500\/10"/g,
  'className="w-full appearance-none rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20"'
)
code = code.replace(
  /className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50"\n/g,
  'className="flex cursor-pointer items-center gap-3 rounded-2xl p-3 transition-all hover:bg-slate-50 hover:shadow-sm"\n'
)

// The combo box styling (contact drop down)
code = code.replace(
  /className="absolute left-0 right-0 top-full z-10 mt-2 max-h-60 overflow-y-auto rounded-xl border border-gray-100 bg-white p-1 shadow-lg shadow-gray-200\/50"/g,
  'className="absolute left-0 right-0 top-full z-10 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-slate-200/60 bg-white/95 p-1.5 shadow-xl shadow-slate-200/50 backdrop-blur-xl"'
)


fs.writeFileSync(file, code, 'utf8')
