const fs = require('fs');

function fixComponents() {
  const path = 'apps/web/src/app/(dashboard)/settings/billing/components.tsx';
  let code = fs.readFileSync(path, 'utf8');

  // Fix 1: Order ID in CurrentPlanCard
  code = code.replace(
    /Order: \{subscription\.boosterAiOrderId\}/g,
    `Order: <span className="inline-block align-bottom max-w-[100px] sm:max-w-none truncate">{subscription.boosterAiOrderId}</span>`
  );

  // Fix 2: TxHash in TransactionHistoryCard (if it's still there?)
  code = code.replace(
    /<p className="mt-2 break-all font-mono text-xs text-gray-500">\{subscription\.txHash\}<\/p>/g,
    '<p className="mt-2 font-mono text-xs text-gray-500 truncate">{subscription.txHash}</p>'
  );

  // Fix 3: Payment ID in RefundCard
  code = code.replace(
    /Payment ID:\{' '\}[\s\n]*<span className="font-mono text-xs text-gray-500">\{refund\.paymentId \?\? '—'\}<\/span>/g,
    `Payment ID:{' '}
            <span className="font-mono text-xs text-gray-500 max-w-[120px] sm:max-w-none inline-block align-bottom truncate">{refund.paymentId ?? '—'}</span>`
  );

  fs.writeFileSync(path, code);
}

function fixHistory() {
  const path = 'apps/web/src/app/(dashboard)/settings/billing/history/page.tsx';
  let code = fs.readFileSync(path, 'utf8');

  // Fix 1: TxHash
  // <p className="text-xs font-mono text-gray-600 break-all bg-gray-100/50 p-2 rounded-lg border border-gray-200/50 mt-1">
  code = code.replace(
    /<p className="text-xs font-mono text-gray-600 break-all bg-gray-100\/50 p-2 rounded-lg border border-gray-200\/50 mt-1">\s*\{subscription\.txHash\}\s*<\/p>/g,
    `<p className="text-xs font-mono text-gray-600 truncate bg-gray-100/50 p-2 rounded-lg border border-gray-200/50 mt-1" title={subscription.txHash}>
                    {subscription.txHash}
                  </p>`
  );

  // Fix 2: Order ID
  // Order ID: <span className="font-mono text-gray-800 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">{subscription.boosterAiOrderId}</span>
  code = code.replace(
    /Order ID: <span className="font-mono text-gray-800 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">\{subscription\.boosterAiOrderId\}<\/span>/g,
    `Order ID: <span className="font-mono text-gray-800 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm max-w-[120px] sm:max-w-none inline-block align-bottom truncate" title={subscription.boosterAiOrderId}>{subscription.boosterAiOrderId}</span>`
  );
  
  fs.writeFileSync(path, code);
}

fixComponents();
fixHistory();
console.log('Mobile minification applied.');
