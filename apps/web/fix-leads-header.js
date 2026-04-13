const fs = require('fs')
const file = 'src/app/(dashboard)/leads/components.tsx'
let code = fs.readFileSync(file, 'utf8')

const oldHeader = `    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lead Submissions</h1>
        <p className="mt-1 text-sm text-gray-500">
          All form submissions from your public card pages.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
        <SelectField
          value={cardFilter}
          onChange={(event) => onCardFilter(event.target.value)}
          className="w-full rounded-xl px-3 py-2.5 pr-10 focus:border-indigo-500 focus:ring-indigo-100 sm:w-auto"
        >
          <option value="">All cards</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              /{card.handle}
            </option>
          ))}
        </SelectField>

        <button
          type="button"
          onClick={onExport}
          className="app-touch-target inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 sm:w-auto"
        >
          <Download className="h-4 w-4" />
          Export lead submissions CSV
        </button>
      </div>
    </div>`

const newHeader = `    <div className="relative overflow-hidden rounded-[36px] bg-slate-900 px-8 py-10 shadow-2xl sm:px-10 sm:py-12 z-0">
      {/* Background glows */}
      <div className="absolute -left-10 top-0 h-64 w-64 rounded-full bg-violet-600/30 blur-[80px]" />
      <div className="absolute -right-10 bottom-0 h-64 w-64 rounded-full bg-indigo-600/30 blur-[80px]" />
      <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 shadow-inner backdrop-blur-sm mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Lead Generation</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Lead <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Submissions</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm font-medium text-slate-400 sm:text-base">
            All form submissions captured right from your public card pages. Turn interactions into opportunities.
          </p>
        </div>
        
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[160px]">
            <SelectField
              value={cardFilter}
              onChange={(event) => onCardFilter(event.target.value)}
              className="w-full appearance-none rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/20 focus:border-violet-500 focus:bg-white/20 focus:ring-[3px] focus:ring-violet-500/20 sm:w-auto"
            >
              <option value="" className="text-gray-900 bg-white">All cards</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id} className="text-gray-900 bg-white">
                  /{card.handle}
                </option>
              ))}
            </SelectField>
          </div>

          <button
            type="button"
            onClick={onExport}
            className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-slate-900 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-100 to-indigo-100 opacity-0 transition-opacity group-hover:opacity-100" />
            <Download className="relative z-10 h-4 w-4" />
            <span className="relative z-10">Export CSV</span>
          </button>
        </div>
      </div>
    </div>`

code = code.replace(oldHeader, newHeader)
fs.writeFileSync(file, code, 'utf8')
