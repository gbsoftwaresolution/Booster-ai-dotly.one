const fs = require('fs')
const file = 'src/app/(dashboard)/tasks/page.tsx'
let code = fs.readFileSync(file, 'utf8')

// Table structure
code = code.replace(
  '<table className="app-table">',
  '<table className="min-w-full text-left text-sm whitespace-nowrap">'
)
code = code.replace(
  /<th className="(.*?)text-xs font-semibold uppercase tracking-wider text-gray-500(.*?)">/g,
  '<th className="$1text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3$2">'
)

code = code.replace(
  /<tbody className="divide-y divide-slate-100\/80">/g,
  '<tbody className="divide-y divide-slate-100/50">'
)

code = code.replace(
  /className="transition hover:bg-white\/65"/g,
  'className="group relative bg-white/60 backdrop-blur-xl transition-all hover:bg-white hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] focus-within:bg-white"'
)

// Desktop table inner text 
code = code.replace(
  /className={`font-medium \$\{task.completed \? 'text-gray-500 line-through' : 'text-gray-900'\}`}/g,
  'className={`text-[15px] font-bold ${task.completed ? "text-slate-400 line-through decoration-slate-300" : "text-slate-900"}`}'
)

code = code.replace(
  /className={`\$\{overdue \? 'text-red-600' : 'text-gray-500'\}`}/g,
  'className={`font-medium ${overdue ? "text-rose-500" : "text-slate-500"}`}'
)

code = code.replace(
  /className="font-medium text-indigo-600 hover:underline"/g,
  'className="font-bold text-indigo-600 transition-colors hover:text-indigo-700"'
)

fs.writeFileSync(file, code, 'utf8')
