const fs = require('fs');

const pagePath = 'apps/web/src/app/(dashboard)/settings/billing/page.tsx';
const compPath = 'apps/web/src/app/(dashboard)/settings/billing/components.tsx';

let pageCode = fs.readFileSync(pagePath, 'utf8');
let compCode = fs.readFileSync(compPath, 'utf8');

// page.tsx adjustments
// Update overall layout container
pageCode = pageCode.replace(
  /className="p-8 pb-12 w-full max-w-7xl mx-auto"/g,
  'className="p-4 sm:p-8 pb-12 w-full max-w-7xl mx-auto"'
);
pageCode = pageCode.replace(
  /className="text-4xl font-black/g,
  'className="text-3xl sm:text-4xl font-black'
);
// Update layout splits (grid-cols-12 -> flex col on mobile)
pageCode = pageCode.replace(
  /className="grid grid-cols-1 md:grid-cols-12 gap-12 mt-12"/g,
  'className="flex flex-col lg:flex-row gap-8 lg:gap-12 mt-8 sm:mt-12 w-full"'
);
pageCode = pageCode.replace(
  /className="md:col-span-7 space-y-10"/g,
  'className="flex-1 w-full space-y-8 sm:space-y-10"'
);
pageCode = pageCode.replace(
  /className="md:col-span-5 relative"/g,
  'className="w-full lg:w-[400px] xl:w-[480px] shrink-0 relative mt-8 lg:mt-0"'
);

// components.tsx adjustments
compCode = compCode.replace(
  /grid-cols-3/g,
  'grid-cols-1 sm:grid-cols-3'
);
compCode = compCode.replace(
  /gap-8/g,
  'gap-4 sm:gap-8'
);
compCode = compCode.replace(
  /className="p-8"/g,
  'className="p-5 sm:p-8"'
);
compCode = compCode.replace(
  /className="p-6"/g,
  'className="p-4 sm:p-6"'
);
compCode = compCode.replace(
  /flex items-center justify-between/g,
  'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0'
);
compCode = compCode.replace(
  /flex-row items-center gap-4/g,
  'flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4'
);

fs.writeFileSync(pagePath, pageCode);
fs.writeFileSync(compPath, compCode);
console.log('Made responsive edits');
