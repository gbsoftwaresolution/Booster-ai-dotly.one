const fs = require('fs')
const file = 'src/app/(dashboard)/crm/custom-fields/page.tsx'
let code = fs.readFileSync(file, 'utf8')

const oldHeader = `      {/* Header */}
      <div className="app-panel flex items-center justify-between rounded-[30px] px-6 py-6 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-500/80">
            CRM Setup
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Custom Fields</h1>
          <p className="mt-2 text-sm text-gray-500">
            Define extra fields that appear on every contact record in your CRM.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Field
        </button>
      </div>`

const newHeader = `      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[36px] bg-slate-900 px-8 py-10 shadow-2xl sm:px-10 sm:py-12 z-0">
        {/* Background glows */}
        <div className="absolute -left-10 top-0 h-64 w-64 rounded-full bg-blue-600/30 blur-[80px]" />
        <div className="absolute -right-10 bottom-0 h-64 w-64 rounded-full bg-indigo-600/30 blur-[80px]" />
        <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 shadow-inner backdrop-blur-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">CRM Setup</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Custom <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Fields</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium text-slate-400 sm:text-base">
              Define extra fields that appear on every contact record in your CRM. Adapt Dotly perfectly to your business model.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="group relative flex items-center gap-2 overflow-hidden rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-slate-900 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 opacity-0 transition-opacity group-hover:opacity-100" />
            <Plus className="relative z-10 h-4 w-4" />
            <span className="relative z-10">Add Field</span>
          </button>
        </div>
      </div>`

code = code.replace(oldHeader, newHeader)

const oldEmptyState = `      {/* Empty state */}
      {!loading && fields.length === 0 && (
        <div className="app-empty-state">
          <GripVertical size={40} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-gray-700 font-semibold mb-1">No custom fields yet</h3>
          <p className="text-sm text-gray-400 mb-4">
            Add fields like &quot;LinkedIn URL&quot;, &quot;Lead Source&quot;, or &quot;Preferred
            Contact&quot;.
          </p>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Add your first field
          </button>
        </div>
      )}`

const newEmptyState = `      {/* Empty state */}
      {!loading && fields.length === 0 && (
        <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/60 px-8 py-16 text-center backdrop-blur-xl shadow-sm transition-all">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-50/50 shadow-inner mb-6">
            <GripVertical size={32} className="text-blue-400" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 mb-2">No custom fields yet</h3>
          <p className="mx-auto max-w-sm text-sm font-medium text-slate-500 mb-8">
            Add fields like &quot;LinkedIn URL&quot;, &quot;Lead Source&quot;, or &quot;Preferred Contact&quot; to capture exactly what you need.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg active:scale-95"
          >
            Add your first field
          </button>
        </div>
      )}`

code = code.replace(oldEmptyState, newEmptyState)

fs.writeFileSync(file, code, 'utf8')
