const fs = require('fs')
const p = 'apps/web/src/app/(dashboard)/analytics/components.tsx'
let c = fs.readFileSync(p, 'utf8')

if (!c.includes('import { cn }')) {
  c = c.replace(/import \{ Eye, TrendingUp, RefreshCw, Download \} from 'lucide-react'/,
  "import { Eye, TrendingUp, RefreshCw, Download } from 'lucide-react'\nimport { cn } from '@/lib/cn'")
}

fs.writeFileSync(p, c, 'utf8')
