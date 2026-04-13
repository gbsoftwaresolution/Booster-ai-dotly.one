const fs = require('fs');

let file = 'src/app/(dashboard)/pipelines/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Text-white in the Summary Cards
code = code.replace(
  /<p className="mt-1 text-lg font-extrabold text-white">\{value\}<\/p>/g,
  '<p className="mt-1 text-[22px] font-extrabold tracking-tight text-slate-900">{value}</p>'
);

// 2. The Focus block (dark styling -> light glass styling)
code = code.replace(
  /className="inline-flex max-w-full items-start gap-3 rounded-2xl bg-white\/5 p-3 text-xs font-medium text-slate-500 border border-white\/10 w-full"/g,
  'className="inline-flex max-w-full items-start gap-3 rounded-2xl bg-sky-100/50 p-4 text-[13px] font-medium text-slate-600 border border-sky-200/60 w-full shadow-inner"'
);
code = code.replace(
  /<strong className="text-white block mb-0.5">/g,
  '<strong className="text-slate-900 block mb-0.5">'
);

// 3. Create Pipeline Button
code = code.replace(
  /className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-slate-900 px-6 py-3\.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95"/g,
  'className="relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 sm:w-auto"'
);
// Remove the gradient from the button
code = code.replace(
  /<div className="absolute inset-0 bg-gradient-to-r from-sky-100 to-indigo-100 opacity-0 transition-opacity group-hover:opacity-100" \/>\n\s*<Plus className="relative z-10 h-4 w-4" \/>\n\s*<span className="relative z-10">New Pipeline<\/span>/g,
  '<Plus className="h-4 w-4" />\n                <span>New Pipeline</span>'
);

// 4. Loading state
code = code.replace(
  /<div className="flex items-center justify-center py-20 text-gray-400">Loading\.\.\.<\/div>/g,
  '<div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600"></div></div>'
);

// 5. Stage chips right arrows
code = code.replace(
  /<span className="text-xs text-gray-300">→<\/span>/g,
  '<span className="text-[13px] font-bold text-slate-300">→</span>'
);
// Stage chips UI
code = code.replace(
  /className="rounded-full px-2\.5 py-1 text-xs font-semibold text-white"/g,
  'className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm ring-1 ring-inset ring-white/20"'
);

// Empty state improvements
code = code.replace(
  /className="relative overflow-hidden rounded-\[24px\] border border-white\/80 bg-white\/60 px-6 py-12 text-center backdrop-blur-xl shadow-sm transition-all m-4"/g,
  'className="relative mx-auto mt-8 max-w-2xl overflow-hidden rounded-[32px] border border-slate-200/60 bg-white/60 p-12 text-center shadow-sm backdrop-blur-xl"'
);

fs.writeFileSync(file, code, 'utf8');
