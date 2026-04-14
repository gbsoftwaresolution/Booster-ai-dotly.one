const fs = require('fs');

const path = 'apps/web/src/app/(dashboard)/settings/billing/components.tsx';
let code = fs.readFileSync(path, 'utf8');

// The billing snapshot metrics grid code is around line 138-146.
const oldGrid = `              <div
                key={label}
                className="flex flex-col items-center xl:items-start rounded-[24px] border border-white/80 bg-white/60 px-4 py-4 shadow-sm backdrop-blur-md transition-transform duration-500 hover:-translate-y-1 hover:bg-white/80 hover:shadow-md ring-1 ring-black/5 text-center xl:text-left w-full min-w-0"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">
                  {label}
                </p>
                <p className="mt-1.5 text-base sm:text-lg font-extrabold text-gray-900">{value}</p>
              </div>`;

const newGrid = `              <div
                key={label}
                className="flex flex-col items-center xl:items-start rounded-[20px] sm:rounded-[24px] border border-white/80 bg-white/60 px-3 sm:px-4 py-3 sm:py-4 shadow-sm backdrop-blur-md transition-transform duration-500 hover:-translate-y-1 hover:bg-white/80 hover:shadow-md ring-1 ring-black/5 text-center xl:text-left w-full min-w-0"
              >
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-[0.2em] text-indigo-400 w-full truncate">
                  {label}
                </p>
                <p className="mt-1 sm:mt-1.5 text-sm sm:text-lg font-extrabold text-gray-900 w-full truncate">{value}</p>
              </div>`;

code = code.replace(oldGrid, newGrid);

// Also let's fix the plan tabs in UpgradePlanCard:
code = code.replace(
  /'relative flex items-center justify-center rounded-\[18px\] border px-6 py-3\.5 text-sm font-bold transition-all duration-300 min-w-\[120px\]',/g,
  "'flex-1 sm:flex-none relative flex items-center justify-center rounded-[14px] sm:rounded-[18px] border px-3 sm:px-6 py-3 sm:py-3.5 text-xs sm:text-sm font-bold transition-all duration-300 min-w-0 sm:min-w-[120px]',"
);

fs.writeFileSync(path, code);
console.log('Fixed tight mobile spaces.');
