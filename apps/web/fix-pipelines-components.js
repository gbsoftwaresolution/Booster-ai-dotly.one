const fs = require('fs');

let file = 'src/app/(dashboard)/pipelines/components.tsx';
let code = fs.readFileSync(file, 'utf8');

// Align Modal radii
code = code.replace(
  /rounded-\[24px\] bg-white\/95/g,
  'rounded-[32px] bg-white/95'
);

// Align footer rounded bottom to 32px
code = code.replace(
  /rounded-b-\[36px\]/g,
  'rounded-b-[32px]'
);

// Fix Delete dialog title and buttons
code = code.replace(
  /id="pipelines-confirm-dialog-title" className="text-xl font-extrabold tracking-tight text-slate-900"/g,
  'id="pipelines-confirm-dialog-title" className="text-2xl font-extrabold tracking-tight text-slate-900"'
);
code = code.replace(
  /className="app-touch-target rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"/g,
  'className="w-full rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 sm:w-auto active:scale-95"'
);
code = code.replace(
  /className="app-touch-target flex items-center justify-center rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-rose-700 disabled:opacity-50"/g,
  'className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-rose-700 hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"'
);

fs.writeFileSync(file, code, 'utf8');
