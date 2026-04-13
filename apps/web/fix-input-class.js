const fs = require('fs')
const file = 'src/app/(dashboard)/crm/custom-fields/components.tsx'
let code = fs.readFileSync(file, 'utf8')

code = code.replace(
  /className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/g,
  'className="w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20"'
)

fs.writeFileSync(file, code, 'utf8')
