const fs = require('fs');

const compPath = 'apps/web/src/app/(dashboard)/settings/billing/components.tsx';
let compCode = fs.readFileSync(compPath, 'utf8');

// 1. Table in Current Plan Card needs an overflow wrapper
compCode = compCode.replace(
  /<div className="mt-8 rounded-\[24px\] border border-white\/60 bg-white\/60 p-4 shadow-sm backdrop-blur-md ring-1 ring-black\/5">/g,
  '<div className="mt-8 rounded-[24px] border border-white/60 bg-white/60 p-4 shadow-sm backdrop-blur-md ring-1 ring-black/5 overflow-x-auto">'
);

// 2. Billing snapshot header wrap
compCode = compCode.replace(
  /<div className="flex items-center justify-between gap-3">/g,
  '<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">'
);

// 3. Billing hero grid gaps and padding
compCode = compCode.replace(
  /xl:grid xl:grid-cols-\[1\.35fr_0\.92fr\]/g,
  'xl:grid xl:grid-cols-[1.35fr_0.92fr]' // already good
);

// 4. Payment method grid explicitly 1 on mobile
compCode = compCode.replace(
  /<div className="grid gap-3 sm:grid-cols-3">/g,
  '<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">'
);

// 5. Subscription cards: 
compCode = compCode.replace(
  /grid w-full max-w-sm sm:max-w-xl grid-cols-2 gap-3 sm:grid-cols-4/g,
  'grid w-full max-w-sm sm:max-w-xl grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4'
);

// 6. Any p-8 or p-10 that could be smaller on mobile
compCode = compCode.replace(
  /p-6 sm:p-10/g,
  'p-5 sm:p-10'
);
compCode = compCode.replace(
  /p-8 2xl:p-10/g,
  'p-5 sm:p-8 2xl:p-10'
);

// 7. Make billing duration cards responsive (vertical stack already but let's check p-4)
compCode = compCode.replace(
  /gap-4 rounded-\[20px\]/g,
  'gap-3 sm:gap-4 rounded-[20px]'
);
compCode = compCode.replace(
  /p-4 border/g,
  'p-3 sm:p-4 border'
);


fs.writeFileSync(compPath, compCode);
console.log('Mobile fixes applied.');
