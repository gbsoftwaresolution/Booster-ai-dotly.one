const fs = require('fs')

const FILE_PATH_COMPONENTS = "apps/web/src/app/(dashboard)/settings/billing/components.tsx"
const FILE_PATH_PAGE = "apps/web/src/app/(dashboard)/settings/billing/page.tsx"

function fixComponents() {
  let content = fs.readFileSync(FILE_PATH_COMPONENTS, 'utf8')
  
  // Remove TransactionHistoryCard entirely
  content = content.replace(/export function TransactionHistoryCard\(.*?\{[\s\S]*?\}\n\}/m, '')
  
  fs.writeFileSync(FILE_PATH_COMPONENTS, content)
  console.log('Fixed components.tsx')
}

function fixPage() {
  let content = fs.readFileSync(FILE_PATH_PAGE, 'utf8')
  
  // Remove the rendering of TransactionHistoryCard
  content = content.replace(/<TransactionHistoryCard subscription=\{subscription\} expiryDate=\{expiryDate\} \/>/g, `
        {/* Transaction History Link instead of card */}
        <div className="mt-8 flex justify-end">
          <Link
             href="/settings/billing/history"
             className="inline-flex items-center gap-2 rounded-xl bg-white/60 px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300/50 hover:bg-gray-50/80 transition-all hover:ring-gray-300"
          >
            <Activity className="h-4 w-4 text-brand-500" />
             View Transaction History
          </Link>
        </div>
`)
  
  // Also make sure to add Activity icon if missing, and remove the import of TransactionHistoryCard if present
  if (!content.includes('Activity')) {
     content = content.replace("import { CreditCard, Rocket,", "import { CreditCard, Rocket, Activity,")
     if (!content.includes('Activity') && content.includes('import {')) {
         content = content.replace("import {", "import { Activity,")
     }
  }

  content = content.replace(/TransactionHistoryCard,\s*/g, '')

  fs.writeFileSync(FILE_PATH_PAGE, content)
  console.log('Fixed page.tsx')
}

fixComponents()
fixPage()

