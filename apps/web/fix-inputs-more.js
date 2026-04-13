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
  /className="block w-full rounded-xl border-gray-200 bg-gray-50\/50 px-4 py-3 pl-10 text-sm text-gray-900 transition-colors placeholder:text-gray-400 hover:bg-gray-50 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500\/10"/g,
  'className="block w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 pl-11 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20"'
)

// Fix background blur overlay
code = code.replace(
  /className="fixed inset-0 bg-gray-900\/20 backdrop-blur-sm transition-opacity"/g,
  'className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity"'
)


code = code.replace(
  /className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"/g,
  'className="absolute left-4 top-3.5 h-5 w-5 text-slate-400"'
)


fs.writeFileSync(file, code, 'utf8')
