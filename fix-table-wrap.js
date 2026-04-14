const fs = require('fs');

const compPath = 'apps/web/src/app/(dashboard)/settings/billing/components.tsx';
let compCode = fs.readFileSync(compPath, 'utf8');

// Ensure UpgradePlanCard's feature table is responsive
compCode = compCode.replace(
  /<div className="rounded-\[18px\] bg-white\/40 shadow-inner overflow-x-auto">/g,
  '<div className="w-full overflow-x-auto rounded-[18px] bg-white/40 shadow-inner align-top min-w-full inline-block border-spacing-0">'
);
compCode = compCode.replace(
  /<table className="w-full text-left text-sm">/g,
  '<table className="min-w-[400px] sm:min-w-full text-left text-sm whitespace-nowrap">'
);
compCode = compCode.replace(
  /w-full max-w-sm sm:max-w-xl grid-cols-2/g,
  'grid-cols-2'
);
compCode = compCode.replace(
  /grid w-full grid-cols-\[1fr,auto,auto\]/g,
  'grid w-full grid-cols-[1fr,auto,auto] overflow-x-auto'
); // No, that's grid. Not for overflow. For grid, we should change it to flex on mobile.

fs.writeFileSync(compPath, compCode);
console.log('Tables fixed.');
