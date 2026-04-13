const fs = require('fs');

let file = 'src/app/(dashboard)/scheduling/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /className="mt-0\.5 h-10 w-10 flex-shrink-0 rounded-xl"/g,
  'className="mt-0.5 h-12 w-12 flex-shrink-0 rounded-[18px] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_8px_16px_-6px_rgba(0,0,0,0.15)] ring-1 ring-black/5 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3"'
);

fs.writeFileSync(file, code, 'utf8');
