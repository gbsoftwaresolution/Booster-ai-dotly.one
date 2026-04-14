const fs = require('fs');

let file = 'apps/web/src/app/(dashboard)/settings/billing/components.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /{hasWallet === false && walletAddress \? \([\s\S]*?Connect your wallet above to continue with crypto checkout.'}\n\s*<\/p>\n\s*)}/m;

const replacement = `<button
                  type="button"
                  onClick={() => {
                    window.location.href = \`/settings/billing/checkout?plan=\${selectedPlan}&duration=\${selectedDuration}\`;
                  }}
                  disabled={subscribing || cryptoBlocked}
                  className={cn(
                    'w-full sm:w-auto rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.25)] transition-all hover:bg-indigo-700 hover:shadow-[0_6px_20px_rgba(79,70,229,0.35)] active:scale-[0.98]',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  {subscribing ? (subscribeStep ?? 'Processing…') : 'Pay with crypto'}
                </button>`;

code = code.replace(regex, replacement);
fs.writeFileSync(file, code, 'utf8');
