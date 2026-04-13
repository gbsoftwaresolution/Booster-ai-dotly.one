const fs = require('fs');

let file = 'src/app/(apps)/apps/scheduling/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. The Hero wrapper changes to our "Magic" premium glass style
code = code.replace(
  /<div className="app-panel relative overflow-hidden rounded-\[34px\] px-6 py-6 sm:px-8 sm:py-7">/g,
  '<div className="relative overflow-hidden rounded-[32px] border border-slate-200/60 bg-white/60 p-6 sm:p-8 backdrop-blur-xl shadow-sm">'
);

// 2. Remove the old messy absolute radial gradient div that was obscuring it
code = code.replace(
  /<div\n\s*className="absolute inset-0 opacity-90"\n\s*aria-hidden="true"\n\s*style=\{\{.*?\n.*?\n.*?>/g,
  '<div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none" style={{ backgroundImage: \'radial-gradient(circle at center, #94a3b8 1px, transparent 1px)\', backgroundSize: \'24px 24px\' }} />'
);

// 3. Typography and Layout fixes for mobile (Grid items and text sizes)
code = code.replace(
  /<div className="relative grid gap-5 xl:grid-cols-\[1\.3fr_0\.9fr\] xl:items-start">/g,
  '<div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">'
);
code = code.replace(
  /className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-\[11px\] font-semibold uppercase tracking-\[0\.22em\] text-emerald-600"/g,
  'className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-600 shadow-inner backdrop-blur-sm"'
);
code = code.replace(
  /className="mt-3 text-2xl font-bold text-gray-900 sm:text-\[2rem\]"/g,
  'className="mt-3 text-[28px] leading-[1.15] font-extrabold tracking-tight text-slate-900 sm:text-4xl"'
);
code = code.replace(
  /className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-\[15px\]"/g,
  'className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 sm:text-base"'
);

// 4. Update the stats cubes
code = code.replace(
  /className="rounded-\[22px\] border border-white\/80 bg-white\/85 px-3 py-3 shadow-\[0_20px_40px_-32px_rgba\(15,23,42,0\.2\)\]"/g,
  'className="flex flex-col justify-center rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-md"'
);
code = code.replace(
  /className="text-\[10px\] font-semibold uppercase tracking-\[0\.18em\] text-gray-400"/g,
  'className="text-[10px] font-bold uppercase tracking-wider text-slate-400"'
);
code = code.replace(
  /className="mt-1 text-sm font-bold text-gray-900 sm:text-base"/g,
  'className="mt-1.5 text-xl font-extrabold text-slate-900"'
);

// 5. Update the action buttons
code = code.replace(
  /className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-\[0_20px_40px_-28px_rgba\(5,150,105,0\.45\)\] transition-transform hover:-translate-y-0\.5"\n\s*style=\{\{ background: 'linear-gradient\(135deg,#34d399,#059669\)' \}\}/g,
  'className="relative flex w-full sm:w-auto items-center justify-center gap-2 overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95"'
);
code = code.replace(
  /className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"/g,
  'className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-slate-200/60 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95"'
);

// Focus pill
code = code.replace(
  /className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white\/90 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm"/g,
  'className="mt-5 inline-flex max-w-full items-center gap-3 rounded-2xl bg-sky-50/60 p-3 text-[13px] font-medium text-slate-600 shadow-inner border border-sky-100 w-full sm:w-auto"'
);
code = code.replace(
  /<span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">/g,
  '<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-500 shadow-sm">'
);

// Right side mini panel ("Today at a Glance") -> Glass style
code = code.replace(
  /className="app-panel-subtle rounded-\[30px\] p-4 sm:p-5"/g,
  'className="w-full xl:w-80 shrink-0 overflow-hidden rounded-[24px] border border-sky-100 bg-sky-50/50 p-5 shadow-inner backdrop-blur-md"'
);
code = code.replace(
  /<p className="text-xs font-semibold uppercase tracking-\[0\.22em\] text-gray-400">/g,
  '<p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">'
);
code = code.replace(
  /<p className="mt-1 text-sm font-semibold text-gray-900">/g,
  '<p className="mt-1.5 text-[15px] font-extrabold text-slate-900 leading-tight">'
);
code = code.replace(
  /className="rounded-full bg-white px-2\.5 py-1 text-\[10px\] font-semibold uppercase tracking-wide text-emerald-600 shadow-sm"/g,
  'className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-500 ring-1 ring-inset ring-emerald-500/20 shadow-sm"'
);
code = code.replace(
  /className="flex items-center gap-3 rounded-\[24px\] border border-white\/80 bg-white\/80 px-4 py-3"/g,
  'className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-white/60 px-4 py-3 shadow-sm backdrop-blur-xl"'
);
code = code.replace(
  /className="text-xs font-semibold uppercase tracking-wide text-gray-400"/g,
  'className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5 block"'
);
code = code.replace(
  /className="truncate text-sm text-gray-500"/g,
  'className="truncate text-[13px] font-medium text-slate-400"'
);
code = code.replace(
  /className="shrink-0 text-lg font-bold tabular-nums text-gray-900"/g,
  'className="shrink-0 text-xl font-extrabold tabular-nums text-slate-900"'
);

fs.writeFileSync(file, code, 'utf8');
