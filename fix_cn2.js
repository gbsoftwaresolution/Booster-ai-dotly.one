const fs = require('fs')
const p = 'apps/web/src/app/(dashboard)/analytics/components.tsx'
let c = fs.readFileSync(p, 'utf8')

// If previous replace didn't work...
if (!c.includes('import { cn }')) {
  c = "import { cn } from '@/lib/cn'\n" + c
  fs.writeFileSync(p, c, 'utf8')
}
