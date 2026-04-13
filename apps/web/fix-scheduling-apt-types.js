const fs = require('fs');

let file = 'src/app/(dashboard)/scheduling/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Title size & Inactive badge
code = code.replace(
  /<h3 className="font-semibold text-slate-900">\{apt\.name\}<\/h3>/g,
  '<h3 className="truncate text-[17px] font-extrabold text-slate-900">{apt.name}</h3>'
);
code = code.replace(
  /<span className="rounded-full bg-slate-100 px-2 py-0\.5 text-xs text-slate-500">/g,
  '<span className="flex items-center gap-1.5 rounded-full bg-slate-100/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-inset ring-slate-500/20">'
);

// Allow proper wrapping on mobile using sm: breakpoints
code = code.replace(
  /<div className="flex items-start justify-between gap-4">/g,
  '<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">'
);

// Inner section of apt card header wrapping
code = code.replace(
  /<div className="flex items-start gap-4">/g,
  '<div className="flex w-full min-w-0 items-start gap-4 sm:w-auto sm:flex-1">'
);

// Container for action buttons wrapping
code = code.replace(
  /<div className="flex items-center gap-2">/g,
  '<div className="flex shrink-0 flex-wrap items-center gap-2">'
);

// Fix normal buttons to be tactile cubes
code = code.replace(
  /className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-sky-600"/g,
  'className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-sky-50 hover:text-sky-600 active:scale-95"'
);
code = code.replace(
  /className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-sky-600 disabled:opacity-50"/g,
  'className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-sky-50 hover:text-sky-600 active:scale-95 disabled:opacity-50"'
);
code = code.replace(
  /className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"/g,
  'className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-95 disabled:opacity-50"'
);

// Questions and Availability buttons
code = code.replace(
  /className="rounded-lg px-3 py-1\.5 text-xs font-medium text-purple-600 hover:bg-purple-50 disabled:opacity-50"/g,
  'className="flex h-9 items-center justify-center rounded-xl bg-slate-50 px-3 text-[13px] font-bold text-slate-500 transition-all hover:bg-purple-50 hover:text-purple-600 active:scale-95 disabled:opacity-50"'
);
code = code.replace(
  /className="rounded-lg px-3 py-1\.5 text-xs font-medium text-sky-600 hover:bg-sky-50 disabled:opacity-50"/g,
  'className="flex h-9 items-center justify-center rounded-xl bg-slate-50 px-3 text-[13px] font-bold text-slate-500 transition-all hover:bg-sky-50 hover:text-sky-600 active:scale-95 disabled:opacity-50"'
);

// Booking URL block
code = code.replace(
  /className="mt-3 flex items-center gap-2 rounded-\[20px\] px-3 py-2"/g,
  'className="mt-3 flex items-center justify-between gap-2 overflow-hidden rounded-[20px] bg-slate-50 shadow-inner px-4 py-2 border border-slate-100"'
);
code = code.replace(
  /className="flex-shrink-0 text-sky-600 hover:text-sky-700"/g,
  'className="flex shrink-0 h-6 w-6 items-center justify-center rounded-md bg-white text-slate-400 shadow-sm hover:text-sky-600 transition-colors active:scale-95"'
);

// Make the availability summary days more visually appealing
code = code.replace(
  /className=\{`rounded-md px-2 py-0\.5 text-xs font-medium \$\{windows\.length > 0 \? 'bg-sky-50 text-sky-700' : 'bg-slate-50 text-slate-300'\}`\}/g,
  "className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider transition-colors ${windows.length > 0 ? 'bg-sky-100/50 text-sky-600 ring-1 ring-inset ring-sky-500/20' : 'bg-slate-50 text-slate-400'}`}"
);

fs.writeFileSync(file, code, 'utf8');
