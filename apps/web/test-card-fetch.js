const { readFileSync } = require('fs')
const file = readFileSync('src/app/(apps)/apps/cards/[id]/analytics/page.tsx', 'utf8')
const hasCardFetch = file.includes("apiGet(`/cards/${id}`)")
console.log({ hasCardFetch })
