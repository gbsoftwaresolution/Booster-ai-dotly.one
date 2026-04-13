const fs = require('fs')
const file = 'src/app/(dashboard)/crm/custom-fields/components.tsx'
let code = fs.readFileSync(file, 'utf8')

code = code.replace(
  /className="app-dialog-shell"/g,
  'className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-md transition-all sm:p-6"'
)
code = code.replace(
  /className="app-dialog-body-scroll p-8"/g,
  'className="max-h-[70vh] overflow-y-auto p-8 custom-scrollbar"'
)
code = code.replace(
  /className="app-dialog-footer mt-0"/g,
  'className="mt-0"'
)

fs.writeFileSync(file, code, 'utf8')
