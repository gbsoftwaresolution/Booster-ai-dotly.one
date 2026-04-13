const fs = require('fs')
const file = 'src/app/(apps)/apps/cards/[id]/analytics/page.tsx'
let code = fs.readFileSync(file, 'utf8')

// Add state for card Info
if (!code.includes('const [cardInfo')) {
  code = code.replace(
    'const [data, setData] = useState<AnalyticsData | null>(null)',
    'const [data, setData] = useState<AnalyticsData | null>(null)\n  const [cardInfo, setCardInfo] = useState<{ name: string; title: string; company: string; handle: string; avatarUrl: string; isActive: boolean } | null>(null)'
  )
}

// Update the load function to also fetch card info
if (!code.includes('`/cards/${id}`')) {
  code = code.replace(
    /const result = await apiGet<AnalyticsData>\([\s\S]*?,\s*token,\s*controller\.signal,\s*\)/m,
    `const [result, cardData] = await Promise.all([
          apiGet<AnalyticsData>(
            \`/cards/\${id}/analytics?from=\${encodeURIComponent(from)}&to=\${encodeURIComponent(to)}\`,
            token,
            controller.signal,
          ),
          cardInfo ? Promise.resolve(null) : apiGet<any>(\`/cards/\${id}\`, token, controller.signal).catch(() => null)
        ])`
  )
  
  code = code.replace(
    /setData\(result\)/g,
    `setData(result)\n          if (cardData) { const fields = cardData.fields || {}; setCardInfo({ name: fields.name || fields.fullName || cardData.handle || 'Untitled Card', title: fields.title || '', company: fields.company || '', handle: cardData.handle || id, avatarUrl: fields.avatarUrl || '', isActive: cardData.isActive ?? false }); }`
  )
}

// Add new UI for Card data below the header
// We insert it right before {/* Range selector */}
const newBadge = `{/* Selected Card Badge exactly like Cards list */}
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
      )}

      {/* Range selector */}`

code = code.replace('{/* Range selector */}', newBadge)

fs.writeFileSync(file, code, 'utf8')
