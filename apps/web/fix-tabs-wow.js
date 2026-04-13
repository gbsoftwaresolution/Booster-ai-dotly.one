const fs = require('fs');

let file = 'src/app/(dashboard)/scheduling/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Enhance Route Tabs Wrapper
code = code.replace(
  /<div className="flex flex-wrap gap-2 rounded-2xl bg-white\/50 p-1\.5 shadow-sm border border-slate-200\/60 backdrop-blur-xl mb-6">/g,
  '<div className="flex flex-wrap gap-2 rounded-[24px] bg-white/40 p-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-white/60 backdrop-blur-2xl mb-8 relative before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/60 before:via-white/20 before:to-white/60 before:pointer-events-none before:rounded-[24px]">'
);

// Enhance Route Tabs Buttons
code = code.replace(
  /className=\{\`relative rounded-\[14px\] px-6 py-2\.5 text-sm font-bold transition-all \$\{t\.active \? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200\/60' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50\/50'\}\`/g,
  'className={`relative rounded-[18px] px-6 py-3 text-sm font-extrabold transition-all duration-500 ${t.active ? "bg-white text-indigo-600 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] ring-1 ring-black/5 scale-[1.02]" : "text-slate-500 hover:text-slate-800 hover:bg-white/60 hover:shadow-sm"}`'
);

// Do the same for standard tabs
code = code.replace(
  /<div className="flex flex-wrap gap-2 rounded-2xl bg-white\/50 p-1\.5 shadow-sm border border-slate-200\/60 backdrop-blur-xl mb-6">/g,
  '<div className="flex flex-wrap gap-2 rounded-[24px] bg-white/40 p-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-white/60 backdrop-blur-2xl mb-8 relative before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/60 before:via-white/20 before:to-white/60 before:pointer-events-none before:rounded-[24px]">'
);

code = code.replace(
  /className=\{\`relative rounded-\[14px\] px-6 py-2\.5 text-sm font-bold transition-all \$\{tab === t \? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200\/60' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50\/50'\}\`/g,
  'className={`relative rounded-[18px] px-6 py-3 text-sm font-extrabold transition-all duration-500 ${tab === t ? "bg-white text-indigo-600 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] ring-1 ring-black/5 scale-[1.02]" : "text-slate-500 hover:text-slate-800 hover:bg-white/60 hover:shadow-sm"}`'
);

fs.writeFileSync(file, code, 'utf8');
