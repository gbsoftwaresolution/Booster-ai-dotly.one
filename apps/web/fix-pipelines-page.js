const fs = require('fs')
const file = 'src/app/(dashboard)/pipelines/page.tsx'
let code = fs.readFileSync(file, 'utf8')

// Fix Header complete regex match
const oldHeaderStart = '      {/* Header */}'
const oldHeaderEndRegex = /<div className="mt-4 space-y-3">.*?<\/div>\n          <\/div>\n        <\/div>\n      <\/div>$/ms

// To do this simply, we will use replace with string slicing or broad regex.
// Let's replace the whole header box using a regex that goes from {/* Header */} to {error && <StatusNotice message={error} />}

const headerRegex = /\{\/\* Header \*\/\}.*?\{\/\* Error \*\/\}/s
const newHeaderAndError = `{/* Premium Header */}
      <div className="relative overflow-hidden rounded-[36px] bg-slate-900 px-8 py-10 shadow-2xl sm:px-10 sm:py-12 z-0">
        {/* Background glows */}
        <div className="absolute -left-10 top-0 h-64 w-64 rounded-full bg-sky-600/30 blur-[80px]" />
        <div className="absolute -right-10 bottom-0 h-64 w-64 rounded-full bg-indigo-600/30 blur-[80px]" />
        <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 shadow-inner backdrop-blur-sm mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">CRM Setup</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Shape your <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Flows</span> 
            </h1>
            <p className="mt-3 text-sm font-medium text-slate-400 sm:text-base">
              Define stage order, mark the right default pipeline, and keep your contact progression
              system perfectly organized as your CRM grows.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={openCreate}
                className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-slate-900 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-sky-100 to-indigo-100 opacity-0 transition-opacity group-hover:opacity-100" />
                <Plus className="relative z-10 h-4 w-4" />
                <span className="relative z-10">New Pipeline</span>
              </button>
            </div>
          </div>

          {/* Stats Sub-panel inside the Header */}
          <div className="flex-shrink-0 w-full lg:w-80">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-md shadow-inner">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Structure Snapshot
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                  Live
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: 'Pipelines', value: loading ? '—' : pipelines.length },
                  { label: 'Default Flow', value: loading ? '—' : defaultPipeline ? 'Set' : 'Missing' },
                  { label: 'Total Stages', value: loading ? '—' : totalStages },
                  { label: 'Avg Stages', value: loading ? '—' : avgStages },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="inline-flex max-w-full items-start gap-3 rounded-2xl bg-white/5 p-3 text-xs font-medium text-slate-300 border border-white/10 w-full">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                  <GitBranch className="h-3.5 w-3.5" />
                </span>
                <span className="leading-relaxed"><strong className="text-white block mb-0.5">Focus</strong>{focusMessage}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}`

code = code.replace(headerRegex, newHeaderAndError)

// Empty State
code = code.replace(
  /<div className="app-empty-state">.*?<\/div>\n      \) : \(/ms,
  `<div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/60 px-8 py-16 text-center backdrop-blur-xl shadow-sm transition-all m-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-50 to-indigo-50/50 shadow-inner mb-6">
            <GitBranch size={32} className="text-sky-400" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 mb-2">No pipelines yet</h3>
          <p className="mx-auto max-w-sm text-sm font-medium text-slate-500 mb-8">
            Create your first pipeline to start organizing contacts and sales stages.
          </p>
        </div>
      ) : (`
)

// List Card updates
code = code.replace(
  /key=\{\s*pipeline\.id\s*\}.*?className="app-panel rounded-\[24px\] p-5"/g,
  'key={pipeline.id} className="group relative flex flex-col gap-4 rounded-[28px] border border-slate-200/60 bg-white/60 p-6 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:bg-white"'
)

// Default pill
code = code.replace(
  /className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"/g,
  'className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 ring-1 ring-inset ring-amber-500/20"'
)

// Pipeline Title
code = code.replace(
  /className="truncate text-base font-bold text-gray-900"/g,
  'className="truncate text-[17px] font-extrabold text-slate-900"'
)

// Action buttons (Set Default / Edit / Delete)
code = code.replace(
  /className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-500 disabled:opacity-50"/g,
  'className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-amber-50 hover:text-amber-500 disabled:opacity-50"'
)
code = code.replace(
  /className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-sky-50 hover:text-sky-600 disabled:opacity-50"/g,
  'className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"'
)
code = code.replace(
  /className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"/g,
  'className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"'
)

fs.writeFileSync(file, code, 'utf8')
