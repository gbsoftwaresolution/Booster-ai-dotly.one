const fs = require('fs');

let file = 'src/app/(dashboard)/scheduling/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /className="group relative flex flex-col gap-4 rounded-\[32px\] border border-slate-200\/60 bg-white\/70 p-6 backdrop-blur-2xl transition-all hover:-translate-y-1 hover:shadow-xl hover:bg-white"/g,
  'className="group relative flex flex-col gap-4 rounded-[32px] border border-white/40 bg-white/40 p-6 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:bg-white/60 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:border-white/80 ring-1 ring-black/5 hover:ring-black/10"'
);

fs.writeFileSync(file, code, 'utf8');
