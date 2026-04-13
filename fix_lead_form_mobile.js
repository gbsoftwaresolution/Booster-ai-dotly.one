const fs = require('fs')
const p = 'apps/web/src/components/card-builder/LeadFormTab.tsx'
let c = fs.readFileSync(p, 'utf8')

// Fix overflow-hidden dropping during previous patch
c = c.replace(/className="relative rounded-\[32px\] border border-white\/80 bg-white\/60 shadow-\[0_4px_20px_-8px_rgba\(15,23,42,0\.06\)\] backdrop-blur-xl transition-all duration-300 hover:shadow-\[0_12px_36px_-12px_rgba\(15,23,42,0\.12\)\] hover:bg-white"/, 'className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/60 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)] hover:bg-white"')

// Update the field card header row layout
c = c.replace(/<div className="flex items-center gap-2 px-3 py-2\.5">\n\s*\{\/\* Drag handle \(visual only\) \*\/\}/, 
`<div className="flex flex-wrap items-center gap-y-3 gap-x-2 px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        {/* Drag handle (visual only) */}`)

c = c.replace(/\{\/\* Reorder \*\/\}\n\s*<div className="flex items-center gap-0\.5 shrink-0">/,
`        </div>
        <div className="flex items-center gap-1 shrink-0 ml-auto">
        {/* Reorder */}\n        <div className="flex items-center gap-0.5 shrink-0">`)

c = c.replace(/<Trash2 className="h-3\.5 w-3\.5" \/>\n\s*<\/button>\n\s*<\/div>/,
`<Trash2 className="h-3.5 w-3.5" />
        </button>
        </div>
      </div>`)

fs.writeFileSync(p, c, 'utf8')
