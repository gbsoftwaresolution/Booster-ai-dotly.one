const fs = require('fs')
const p = 'src/app/(apps)/apps/cards/[id]/analytics/page.tsx'
let code = fs.readFileSync(p, 'utf8')

// Add state for card Info
if (!code.includes('const [cardInfo')) {
  code = code.replace(
    'const [data, setData] = useState<AnalyticsData | null>(null)',
    'const [data, setData] = useState<AnalyticsData | null>(null)\n  const [cardInfo, setCardInfo] = useState<{ title: string; handle: string } | null>(null)'
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
    `setData(result)\n          if (cardData) setCardInfo({ title: cardData.title || cardData.name || 'Untitled Card', handle: cardData.handle || id })`
  )
}

// Update the header
if (code.includes('>Analytics</h1>')) {
  code = code.replace(
    /<h1 className="text-xl font-bold text-gray-900">Analytics<\/h1>\s*<p className="text-\[13px\] font-bold text-slate-400\/80 mt-1">Card performance overview<\/p>/g,
    `<div>
          <h1 className="text-xl font-bold text-gray-900">
            {cardInfo ? \`Analytics for \${cardInfo.title}\` : 'Analytics'}
          </h1>
          <p className="text-[13px] font-bold text-slate-400/80 mt-1">
            {cardInfo ? \`dotly.one/\${cardInfo.handle}\` : 'Card performance overview'}
          </p>
        </div>`
  )
}

fs.writeFileSync(p, code, 'utf8')
