const fs = require('fs');
const path = 'apps/web/src/app/(dashboard)/settings/billing/components.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /Order: <span className="inline-block align-bottom max-w-\[100px\] sm:max-w-none truncate">\{subscription\.boosterAiOrderId\}<\/span>/g,
  'Order: <span className="inline-block align-bottom max-w-[100px] sm:max-w-none truncate" title={subscription.boosterAiOrderId}>{subscription.boosterAiOrderId}</span>'
);

code = code.replace(
  /<p className="mt-2 font-mono text-xs text-gray-500 truncate">\{subscription\.txHash\}<\/p>/g,
  '<p className="mt-2 font-mono text-xs text-gray-500 truncate" title={subscription.txHash}>{subscription.txHash}</p>'
);

code = code.replace(
  /Payment ID:\{' '\}[\s\n]*<span className="font-mono text-xs text-gray-500 max-w-\[120px\] sm:max-w-none inline-block align-bottom truncate">\{refund\.paymentId \?\? '—'\}<\/span>/g,
  `Payment ID:{' '}
            <span className="font-mono text-xs text-gray-500 max-w-[120px] sm:max-w-none inline-block align-bottom truncate" title={refund.paymentId ?? undefined}>{refund.paymentId ?? '—'}</span>`
);

fs.writeFileSync(path, code);
