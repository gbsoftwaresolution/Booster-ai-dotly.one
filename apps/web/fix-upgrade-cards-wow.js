const fs = require('fs');

let file = 'src/app/(dashboard)/settings/billing/components.tsx';
let code = fs.readFileSync(file, 'utf8');

// Update Plan buttons to be world class glass buttons 
code = code.replace(
  /className=\{cn\(\n\s*'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',\n\s*selectedPlan === plan\n\s*\? 'border-brand-500 bg-brand-50 text-brand-700'\n\s*: 'border-gray-200 text-gray-600 hover:border-gray-300',\n\s*\)\}/g,
  `className={cn(
                  'relative flex items-center justify-center rounded-[18px] border px-6 py-3.5 text-sm font-bold transition-all duration-300 min-w-[120px]',
                  selectedPlan === plan
                    ? 'border-indigo-500/20 bg-gradient-to-b from-indigo-50 to-indigo-100/50 text-indigo-700 shadow-[0_4px_12px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30 scale-[1.02]'
                    : 'border-white/60 bg-white/40 text-gray-600 hover:bg-white/80 hover:text-gray-900 shadow-sm active:scale-[0.98]'
                )}`
);

// Inject UPGRADE_FEATURES Table
const splitTarget = /<\/button>\s*\)\)}\s*<\/div>\s*<\/div>\s*<div>\s*<label className="mb-1\.5 block text-sm font-medium text-gray-700">Billing period<\/label>/;

const upgradeFeaturesToInject = \`</button>
            ))}
          </div>

          {/* Dynamic Upgrade Features */}
          <div className="mt-8 rounded-[24px] border border-white/60 bg-white/60 p-4 shadow-sm backdrop-blur-md ring-1 ring-black/5 overflow-hidden">
            <div className="rounded-[18px] bg-white/40 shadow-inner overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200/60 bg-gray-100/50 backdrop-blur-sm">
                    <th className="px-5 py-4 font-bold text-gray-700">Premium feature</th>
                    <th className="px-4 py-4 text-center font-bold text-indigo-900 bg-indigo-50/50">{formatPlanLabel(selectedPlan)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/60">
                  {FEATURES.map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? "bg-white/60 transition-colors hover:bg-white/80" : "bg-transparent transition-colors hover:bg-white/40"}>
                      <td className="px-5 py-3.5 font-medium text-gray-600">{row.label}</td>
                      <td className="bg-indigo-50/20 px-4 py-3.5 text-center">
                        {row.current === true ? (
                          <svg className="mx-auto h-5 w-5 text-indigo-500 backdrop-blur-sm" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                        ) : row.current === false ? (
                          <span className="text-gray-300 mx-auto block w-5 text-center">-</span>
                        ) : (
                          <span className="font-bold text-indigo-700">{row.current}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-indigo-100/50">
          <label className="mb-3 block text-sm font-bold text-gray-950 uppercase tracking-wider">2. Choose billing period</label>\`;

code = code.replace(splitTarget, upgradeFeaturesToInject);

const upgradePlanReturn = \`}): JSX.Element | null {
  if (currentPlan === 'ENTERPRISE') return null

  return (\`;

const upgradePlanReturnReplacement = \`}): JSX.Element | null {
  if (currentPlan === 'ENTERPRISE') return null

  const FEATURES = [
    { label: 'Digital cards', current: selectedPlan === 'PRO' ? '3 cards' : '1 premium card' },
    { label: 'Analytics history', current: selectedPlan === 'PRO' ? 'Advanced analytics' : '30 days' },
    { label: 'Lead capture', current: true },
    { label: 'CRM', current: selectedPlan === 'PRO' ? 'Full CRM' : 'Basic CRM' },
    { label: 'Email signature', current: true },
    { label: 'CSV export', current: selectedPlan === 'PRO' ? true : false },
    { label: 'Custom domain', current: selectedPlan === 'PRO' ? true : false },
    { label: 'Webhooks', current: selectedPlan === 'PRO' ? true : false },
  ];

  return (\`;

code = code.replace(upgradePlanReturn, upgradePlanReturnReplacement);


// Duration Toggle
code = code.replace(
  /<div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">/g,
  '<div className="relative inline-flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-full sm:rounded-full border border-white/80 bg-white/50 p-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] backdrop-blur-2xl ring-1 ring-black/5">'
);

code = code.replace(
  /className=\{cn\(\n\s*'flex items-center gap-1\.5 rounded-full px-3 py-1\.5 text-sm font-medium transition-colors',\n\s*selectedDuration === duration\n\s*\? 'bg-white text-gray-900 shadow'\n\s*: 'text-gray-500 hover:text-gray-700',\n\s*\)\}/g,
  \`className={cn(
                  'relative flex items-center justify-center gap-2.5 rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-500 flex-grow sm:flex-grow-0',
                  selectedDuration === duration
                    ? 'bg-gradient-to-b from-gray-800 to-gray-950 text-white shadow-[0_4px_12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.1)_inset] scale-[1.02]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-sm active:scale-[0.98]'
                )}\`
);

code = code.replace(
  /<span className="rounded-full bg-green-100 px-1\.5 py-0\.5 text-xs font-semibold text-green-700">/g,
  '<span className="rounded-full border border-emerald-200/60 bg-gradient-to-br from-emerald-100 to-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.05em] text-emerald-600 shadow-[0_2px_4px_rgba(16,185,129,0.1)]">'
);


fs.writeFileSync(file, code, 'utf8');
