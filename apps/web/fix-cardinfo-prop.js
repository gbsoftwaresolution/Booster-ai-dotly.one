const fs = require('fs')
const file = 'src/app/(apps)/apps/cards/[id]/analytics/page.tsx'
let code = fs.readFileSync(file, 'utf8')

code = code.replace(
  'function PageHeader({ id }: { id: string }) {',
  'function PageHeader({ id, cardInfo }: { id: string, cardInfo?: { title: string; handle: string } | null }) {'
)

code = code.replace(
  '<PageHeader id={id} />',
  '<PageHeader id={id} cardInfo={cardInfo} />'
)

fs.writeFileSync(file, code, 'utf8')
