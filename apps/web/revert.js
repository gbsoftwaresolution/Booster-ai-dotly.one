const fs = require('fs')
const file = 'src/app/(apps)/apps/cards/[id]/analytics/page.tsx'
const backup = file + ".backup"
let code = fs.readFileSync(file, 'utf8')
if (code.includes('app-panel group relative')) {
    // Looks like we injected malformed jsx or regex matched wrongly
}
// since we didn't back it up, I'll fix the code with a patch manually
