const fs = require('fs')
const file = 'src/app/(apps)/apps/cards/[id]/analytics/page.tsx'
let code = fs.readFileSync(file, 'utf8')

// First, we need to correctly parse the cardData so we can show avatar, name, company, live status
// The card data comes from apiGet('/cards/${id}') which returns the Card details.

if (!code.includes('cardInfo?: {')) {
    // We update the type of cardInfo state
    code = code.replace(
      'const [cardInfo, setCardInfo] = useState<{ title: string; handle: string } | null>(null)',
      "const [cardInfo, setCardInfo] = useState<{ name: string; title: string; company: string; handle: string; avatarUrl: string; isActive: boolean } | null>(null)"
    )
}

if(code.includes('if (cardData) setCardInfo({ title: cardData.title || cardData.name || \'Untitled Card\', handle: cardData.handle || id })')) {
    code = code.replace(
      "if (cardData) setCardInfo({ title: cardData.title || cardData.name || 'Untitled Card', handle: cardData.handle || id })",
      "if (cardData) { const fields = cardData.fields || {}; setCardInfo({ name: fields.name || fields.fullName || cardData.handle || 'Untitled Card', title: fields.title || '', company: fields.company || '', handle: cardData.handle || id, avatarUrl: fields.avatarUrl || '', isActive: cardData.isActive ?? false }); }"
    )
}

// Then we update the badge to look like the CardTile styling
const newBadge = `{/* Selected Card Badge */}
      {cardInfo && (
        <div className="app-panel group relative flex items-center gap-4 rounded-[26px] p-4 transition-all duration-200">
          {cardInfo.avatarUrl ? (
            <img
              src={cardInfo.avatarUrl}
              alt={cardInfo.name}
              className="h-[52px] w-[52px] shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
            />
          ) : (
            <div
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ring-2 ring-white"
              style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
              aria-hidden="true"
            >
              {(cardInfo.name || 'C').split(' ').map(n => n[0] || '').slice(0, 2).join('').toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-gray-900">{cardInfo.name}</p>
            {(cardInfo.title || cardInfo.company) && (
              <p className="truncate text-xs text-gray-500">
                {[cardInfo.title, cardInfo.company].filter(Boolean).join(' \\u00b7 ')}
              </p>
            )}
            <p className="truncate text-[11px] text-gray-300 mt-0.5">
              dotly.one/{cardInfo.handle}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                cardInfo.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400',
              )}
            >
              {cardInfo.isActive ? 'Live' : 'Draft'}
            </span>
            
            <a
              href={\`https://dotly.one/\${cardInfo.handle}\`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white transition-all active:scale-90 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-500 text-gray-400',
              )}
            >
              <Globe2 className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}`

// Replace the old badge
if (code.includes('className="inline-flex w-fit items-center gap-2.5 rounded-2xl border border-sky-100 bg-sky-50/50')) {
  code = code.replace(
    /\{\/\* Selected Card Badge \*\/\}\s*\{cardInfo && \([\s\S]*?\}\)/,
    newBadge
  )
}

fs.writeFileSync(file, code, 'utf8')
