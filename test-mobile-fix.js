const fs = require('fs');
let code = fs.readFileSync('apps/web/src/app/(dashboard)/settings/billing/components.tsx', 'utf8');

// 1. Remove that weird `inline-block` from the overflow wrappers
code = code.replace(
  /<div className="w-full overflow-x-auto rounded-\[18px\] bg-white\/40 shadow-inner align-top min-w-full inline-block border-spacing-0">/g,
  '<div className="w-full overflow-x-auto rounded-[18px] bg-white/40 shadow-inner">'
);

// 2. The other table wrapper
code = code.replace(
  /<div className="mt-8 rounded-\[24px\] border border-white\/60 bg-white\/60 p-4 shadow-sm backdrop-blur-md ring-1 ring-black\/5 overflow-x-auto">/g,
  '<div className="mt-8 rounded-[24px] border border-white/60 bg-white/60 p-4 shadow-sm backdrop-blur-md ring-1 ring-black/5 overflow-x-auto w-full">'
);

// 3. A potential issue is `min-w-[400px]` making the table clip its container if the container doesn't have `min-w-0` ? Not if parent is flex.
code = code.replace(/<table className="min-w-\[400px\] /g, '<table className="w-full min-w-[320px] ');

// Let's check grid gaps
code = code.replace(/mt-8 grid w-full max-w-sm sm:max-w-xl grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4/g, 'mt-8 grid w-full grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4');

// Any padding `px-5 py-8` could be an issue on very small screens? `px-4 py-6` maybe.
code = code.replace(/px-5 py-8 sm:p-10/g, 'p-4 sm:p-10');
code = code.replace(/p-5 sm:p-10/g, 'p-4 sm:p-8');

fs.writeFileSync('apps/web/src/app/(dashboard)/settings/billing/components.tsx', code);
