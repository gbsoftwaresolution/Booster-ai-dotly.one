const fs = require('fs')
const file = 'src/app/(dashboard)/tasks/page.tsx'
let code = fs.readFileSync(file, 'utf8')

const oldHeaderRegex = /<div className="app-panel relative overflow-hidden rounded-\[28px\] px-6 py-6 sm:px-8 sm:py-7">.*?<div\s+className="absolute inset-0 opacity-90".*?\{\/\* Filters \*\/\}/s
const newHeader = `<div className="relative overflow-hidden rounded-[36px] bg-slate-900 px-8 py-10 shadow-2xl sm:px-10 sm:py-12 z-0">
        {/* Background glows */}
        <div className="absolute -left-10 top-0 h-64 w-64 rounded-full bg-emerald-600/30 blur-[80px]" />
        <div className="absolute -right-10 bottom-0 h-64 w-64 rounded-full bg-teal-600/30 blur-[80px]" />
        <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 shadow-inner backdrop-blur-sm mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Action Items</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Tasks</span> & To-Do
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium text-slate-400 sm:text-base">
              Stay on top of follow-ups, resolve overdue work, and keep your next customer action clear and actionable.
            </p>
          </div>
          
          <button
            type="button"
            onClick={openCreate}
            className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-slate-900 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-100 to-teal-100 opacity-0 transition-opacity group-hover:opacity-100" />
            <Plus className="relative z-10 h-4 w-4" />
            <span className="relative z-10">New Task</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="relative z-10 mt-10 grid grid-cols-2 gap-3 sm:max-w-3xl sm:grid-cols-4">
          {[
            { label: 'All Tasks', value: loading ? '—' : (summary?.totalTasks ?? total) },
            { label: 'Pending', value: loading ? '—' : pendingCount },
            { label: 'Overdue', value: loading ? '—' : overdueCount },
            { label: 'Due Today', value: loading ? '—' : dueTodayCount },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md shadow-inner"
            >
              <div className="text-2xl font-extrabold tabular-nums text-white">{value}</div>
              <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}`

code = code.replace(oldHeaderRegex, newHeader)
fs.writeFileSync(file, code, 'utf8')
