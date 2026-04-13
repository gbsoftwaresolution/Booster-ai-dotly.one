const fs = require('fs');

let file = 'src/app/(dashboard)/scheduling/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /className="relative overflow-hidden rounded-\[32px\] border border-slate-200\/60 bg-white\/60 p-6 sm:p-8 backdrop-blur-xl shadow-sm mb-6"/g,
  'className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between overflow-hidden rounded-[32px] border border-slate-200/60 bg-white/60 p-6 sm:p-8 backdrop-blur-xl shadow-sm mb-6"'
);

// also let's check the button to make sure it stretches properly on mobile or aligns properly.
// 'relative z-10 flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 sm:w-auto'
code = code.replace(
  /className="relative z-10 flex flex-1 items-center justify-center/g,
  'className="relative z-10 flex w-full sm:w-auto items-center justify-center'
);

fs.writeFileSync(file, code, 'utf8');
