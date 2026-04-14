const fs = require('fs');

const HISTORY_PAGE_PATH = 'apps/web/src/app/(dashboard)/settings/billing/history/page.tsx';
const BILLING_PAGE_PATH = 'apps/web/src/app/(dashboard)/settings/billing/page.tsx';

function fixHistory() {
  let content = fs.readFileSync(HISTORY_PAGE_PATH, 'utf8');
  content = content.replace(/href=\{\\\`https:\/\/arbiscan\.io\/tx\/\\\$\\{subscription\.txHash\\\}\\`\}/, 'href={`https://arbiscan.io/tx/${subscription.txHash}`}');
  fs.writeFileSync(HISTORY_PAGE_PATH, content);
  console.log('Fixed history page.tsx');
}

function fixBilling() {
  let content = fs.readFileSync(BILLING_PAGE_PATH, 'utf8');
  if (!content.includes("import Link from 'next/link'")) {
    content = 'import Link from "next/link"\n' + content;
  }
  if (!content.includes('import { Activity')) {
     if (content.includes('lucide-react')) {
         content = content.replace(/import \{([^}]+)\} from ["']lucide-react["']/, (match, p1) => {
             return `import { Activity, ${p1} } from "lucide-react"`;
         });
     } else {
         content = 'import { Activity } from "lucide-react"\n' + content;
     }
  }
  fs.writeFileSync(BILLING_PAGE_PATH, content);
  console.log('Fixed billing page.tsx');
}

fixHistory();
fixBilling();
