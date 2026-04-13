const fs = require('fs')
const file = 'src/app/(dashboard)/tasks/page.tsx'
let code = fs.readFileSync(file, 'utf8')

// The Empty State error
code = code.replace(
  '<div className="app-empty-state rounded-none border-0 shadow-none">',
  '<div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/60 px-8 py-16 text-center backdrop-blur-xl shadow-sm transition-all m-4">'
)

code = code.replace(
  '<CheckSquare className="mb-4 h-12 w-12 text-gray-300" />',
  '<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-50 to-red-50/50 shadow-inner mb-6"><CheckSquare size={32} className="text-red-400" /></div>'
)

code = code.replace(
  '<p className="app-empty-state-title">Tasks are unavailable</p>',
  '<h3 className="text-xl font-extrabold text-slate-900 mb-2">Tasks are unavailable</h3>'
)

// The normal Empty State
code = code.replace(
  '<div className="app-empty-state rounded-none border-0 shadow-none">',
  '<div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/60 px-8 py-16 text-center backdrop-blur-xl shadow-sm transition-all m-4">'
)

code = code.replace(
  '<CheckSquare className="mb-4 h-12 w-12 text-gray-300" />',
  '<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-blue-50/50 shadow-inner mb-6"><CheckSquare size={32} className="text-indigo-400" /></div>'
)

code = code.replace(
  '<p className="app-empty-state-title">No tasks in this view</p>',
  '<h3 className="text-xl font-extrabold text-slate-900 mb-2">No tasks in this view</h3>'
)

code = code.replace(
  '<p className="app-empty-state-text mt-1">',
  '<p className="mx-auto max-w-sm text-sm font-medium text-slate-500 mb-8">'
)

// Mobile Task cards (`div key={task.id} className="app-panel rounded-[24px] p-4"`)
code = code.replace(
  /className="app-panel rounded-\[24px\] p-4"/g,
  'className="group relative flex flex-col gap-4 rounded-[28px] border border-slate-200/60 bg-white/60 p-5 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:bg-white"'
)

// Desk top table rows 
code = code.replace(
  /className="group transition-colors hover:bg-gray-50 focus-within:bg-gray-50"/g,
  'className="group relative border-b border-slate-100 bg-white/60 backdrop-blur-xl transition-all hover:bg-white hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] focus-within:bg-white"'
)

// Task Title in mobile
code = code.replace(
  /className=`text-base font-semibold \$\{task.completed \? 'text-gray-500 line-through' : 'text-gray-900'\}`/g,
  'className={`text-[17px] font-bold ${task.completed ? "text-slate-400 line-through decoration-slate-300" : "text-slate-900"}`}'
)

code = code.replace(
  /className={`mt-1 text-sm \$\{overdue \? 'text-red-600' : 'text-gray-500'\}`}/g,
  'className={`mt-1 text-sm font-medium ${overdue ? "text-rose-500" : "text-slate-500"}`}'
)

// Task mobile tags
code = code.replace(
  /className={`shrink-0 rounded-full px-2\.5 py-1 text-xs font-medium \$\{\n\s*task\.completed\n\s*\? 'bg-green-100 text-green-700'\n\s*: overdue\n\s*\? 'bg-red-100 text-red-700'\n\s*: 'bg-blue-100 text-blue-700'\n\s*\}`}/g,
  'className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${task.completed ? "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/20" : overdue ? "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-500/20" : "bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-500/20"}`}'
)

// Contact card in mobile
code = code.replace(
  /className="flex flex-col gap-2 rounded-2xl bg-gray-50\/80 p-3"/g,
  'className="flex flex-col gap-2 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100/50"'
)

code = code.replace(
  /className="text-xs font-semibold uppercase tracking-\[0\.14em\] text-gray-400"/g,
  'className="text-[11px] font-bold uppercase tracking-wider text-slate-400"'
)

code = code.replace(
  /className="text-left text-sm font-medium text-indigo-600 hover:underline"/g,
  'className="text-left text-[14px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"'
)


fs.writeFileSync(file, code, 'utf8')
