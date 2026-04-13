const fs = require('fs');

let file = 'src/app/(dashboard)/pipelines/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Upgrade the Card wrapper
code = code.replace(
  /className="group relative flex flex-col gap-4 rounded-\[24px\] border border-slate-200\/60 bg-white\/60 p-6 backdrop-blur-xl transition-all hover:-translate-y-0\.5 hover:shadow-\[0_8px_24px_-12px_rgba\(15,23,42,0\.12\)\] hover:bg-white"/g,
  'className="group relative flex flex-col gap-4 rounded-[32px] border border-slate-200/60 bg-white/70 p-6 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:bg-white"'
);

// Upgrade the text-gray-400 to slate-400
code = code.replace(
  /className="mt-2 text-xs text-gray-400"/g,
  'className="mt-2 text-[13px] font-medium text-slate-400"'
);

// Add a glowing effect or gradient to the Default chip
code = code.replace(
  /className="flex items-center gap-1\.5 rounded-full bg-amber-50 px-2\.5 py-0\.5 text-\[11px\] font-bold uppercase tracking-wider text-amber-600 ring-1 ring-inset ring-amber-500\/20"/g,
  'className="flex items-center gap-1.5 rounded-full bg-amber-100/50 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-600 shadow-sm ring-1 ring-inset ring-amber-500/30 backdrop-blur-md"'
);

fs.writeFileSync(file, code, 'utf8');

let compFile = 'src/app/(dashboard)/pipelines/components.tsx';
let compCode = fs.readFileSync(compFile, 'utf8');

// Gray-400 icons to Slate-400 in components
compCode = compCode.replace(
  /className="app-touch-target rounded p-2 text-gray-400 hover:text-gray-700 disabled:opacity-30"/g,
  'className="app-touch-target flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"'
);
compCode = compCode.replace(
  /className="app-touch-target rounded p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"/g,
  'className="app-touch-target flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30"'
);

fs.writeFileSync(compFile, compCode, 'utf8');
