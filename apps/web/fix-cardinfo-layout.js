const fs = require('fs')
const file = 'src/app/(apps)/apps/cards/[id]/analytics/page.tsx'
let code = fs.readFileSync(file, 'utf8')

// Revert PageHeader
code = code.replace(
  'function PageHeader({ id, cardInfo }: { id: string, cardInfo?: { title: string; handle: string } | null }) {',
  'function PageHeader({ id }: { id: string }) {'
)

code = code.replace(
  `          <h1 className="text-xl font-bold text-gray-900">
            {cardInfo ? \`Analytics for \${cardInfo.title}\` : 'Analytics'}
          </h1>
          <p className="text-[13px] font-bold text-slate-400/80 mt-1">
            {cardInfo ? \`dotly.one/\${cardInfo.handle}\` : 'Card performance overview'}
          </p>`,
  `          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-[13px] font-bold text-slate-400/80 mt-1">Card performance overview</p>`
)

code = code.replace(
  '<PageHeader id={id} cardInfo={cardInfo} />',
  '<PageHeader id={id} />'
)

// Add new UI for Card data below the header
code = code.replace(
  '{/* Range selector */}',
  `{/* Selected Card Badge */}
      {cardInfo && (
        <a 
          href={\`https://dotly.one/\${cardInfo.handle}\`} 
          target="_blank" 
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-2.5 rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-2.5 shadow-sm transition-all hover:bg-sky-50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm">
            <Globe2 className="h-4 w-4 text-sky-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">{cardInfo.title}</span>
            <span className="text-xs font-medium text-slate-500">dotly.one/{cardInfo.handle}</span>
          </div>
        </a>
      )}

      {/* Range selector */}`
)

fs.writeFileSync(file, code, 'utf8')
