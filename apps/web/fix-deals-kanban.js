const fs = require('fs');

let file = 'src/app/(dashboard)/deals/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix focus message container
code = code.replace(
  /className="relative z-10 mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border border-indigo-500\/20 bg-indigo-500\/10 px-4 py-3 text-sm shadow-inner backdrop-blur-md"/g,
  'className="relative z-10 mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border border-sky-200/50 bg-sky-50/50 px-5 py-4 text-sm shadow-inner backdrop-blur-md"'
);
code = code.replace(
  /className="mt-0\.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500\/20 text-indigo-300"/g,
  'className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-500"'
);
code = code.replace(
  /className="font-semibold text-indigo-100"/g,
  'className="font-bold text-sky-900"'
);
code = code.replace(
  /className="mt-0\.5 text-\[13px\] text-indigo-200\/80"/g,
  'className="mt-0.5 text-[13px] font-medium text-sky-700/80"'
);

// Fix empty states
code = code.replace(
  /className="app-empty-state"/g,
  'className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/60 px-6 py-12 text-center backdrop-blur-xl shadow-sm transition-all m-4"'
);
code = code.replace(
  /<BriefcaseBusiness className="mx-auto mb-4 h-12 w-12 text-gray-300" \/>/g,
  '<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-teal-50/50 shadow-inner mb-6"><BriefcaseBusiness size={32} className="text-emerald-400" /></div>'
);
code = code.replace(
  /className="app-empty-state-title"/g,
  'className="text-xl font-extrabold text-slate-900 mb-2"'
);
code = code.replace(
  /className="app-empty-state-text mt-1"/g,
  'className="mx-auto max-w-sm text-sm font-medium text-slate-500 mb-8"'
);
code = code.replace(
  /className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"/g,
  'className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95"'
);

// Search/Filter Bar
code = code.replace(
  /className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-white\/40 p-2 shadow-sm border border-white\/60 backdrop-blur-md"/g,
  'className="group relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white/60 p-4 backdrop-blur-xl transition-all"'
);
code = code.replace(
  /className="w-full rounded-\[18px\] border-none shadow-sm bg-white py-2\.5 pl-4 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500\/50 sm:w-72"/g,
  'className="w-full rounded-xl border border-slate-200/60 bg-white/80 py-2.5 pl-4 pr-10 text-sm font-medium text-slate-900 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-indigo-500/20 sm:w-80"'
);
code = code.replace(
  /className="w-full rounded-\[18px\] border-none shadow-sm bg-white px-4 py-2\.5 pr-10 font-medium focus:ring-2 focus:ring-indigo-500\/50 sm:w-auto"/g,
  'className="w-full rounded-xl border border-slate-200/60 bg-white/80 py-2.5 pl-4 pr-10 text-sm font-medium text-slate-900 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-indigo-500/20 cursor-pointer sm:w-48"'
);

// Mobile Deal List View
code = code.replace(
  /className="app-panel rounded-\[24px\] p-4"/g,
  'className="group relative rounded-2xl border border-slate-200/60 bg-white/60 p-5 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)]"'
);
code = code.replace(
  /className="text-base font-semibold text-gray-900"/g,
  'className="text-lg font-extrabold text-slate-900 tracking-tight"'
);
code = code.replace(
  /className="rounded-2xl bg-gray-50\/90 p-3"/g,
  'className="rounded-2xl bg-slate-50/80 p-4 ring-1 ring-inset ring-slate-100"'
);
code = code.replace(
  /className="text-xs font-semibold uppercase tracking-\[0\.14em\] text-gray-400"/g,
  'className="text-[10px] font-bold uppercase tracking-wider text-slate-400"'
);
code = code.replace(
  /className="mt-1 text-sm font-semibold text-gray-900"/g,
  'className="mt-1 text-sm font-bold text-slate-900"'
);
code = code.replace(
  /className="mt-1 text-sm text-gray-600"/g,
  'className="mt-1 text-[13px] font-medium text-slate-500"'
);
code = code.replace(
  /className="mt-1 truncate text-sm text-gray-500"/g,
  'className="mt-1 truncate text-[13px] font-medium text-slate-500"'
);

// Kanban Columns
code = code.replace(
  /className="app-panel flex w-80 shrink-0 flex-col rounded-\[24px\]"/g,
  'className="flex w-[340px] shrink-0 flex-col rounded-3xl border border-slate-200/60 bg-slate-50/50 backdrop-blur-xl"'
);
code = code.replace(
  /className={`rounded-t-\[24px\] border-b px-4 py-3 \$\{STAGE_HEADER_COLORS\[stage\]\}`}/g,
  'className={`flex items-center justify-between rounded-t-3xl border-b border-slate-200/60 bg-white/60 px-5 py-4 backdrop-blur-md`}'
);
code = code.replace(
  /className="text-sm font-semibold text-gray-800"/g,
  'className="text-[15px] font-bold tracking-tight text-slate-900"'
);
code = code.replace(
  /className="mt-1 text-xs text-gray-500"/g,
  'className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500"'
);
code = code.replace(
  /className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-gray-600 shadow-sm"/g,
  'className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white px-2 text-[11px] font-bold text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200"'
);

// Kanban Cards
code = code.replace(
  /className="app-panel-subtle rounded-\[22px\] p-4"/g,
  'className="group relative rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"'
);
code = code.replace(
  /className="truncate text-sm font-semibold text-gray-900"/g,
  'className="truncate text-[15px] font-bold tracking-tight text-slate-900"'
);
code = code.replace(
  /className="text-lg font-bold text-gray-900"/g,
  'className="text-base font-extrabold tracking-tight text-emerald-600"'
);
code = code.replace(
  /className="mt-3 space-y-1 text-sm text-gray-500"/g,
  'className="mt-3 space-y-1 text-[13px] font-medium text-slate-500"'
);

// Kanban buttons
code = code.replace(
  /className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"/g,
  'className="rounded-xl bg-slate-50 p-2 text-slate-400 opacity-0 transition-opacity ring-1 ring-inset ring-slate-200/60 hover:bg-white hover:text-slate-600 group-hover:opacity-100 disabled:opacity-50"'
);
code = code.replace(
  /className="rounded-lg border border-gray-300 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"/g,
  'className="rounded-xl bg-slate-50 p-2 text-rose-400 opacity-0 transition-opacity ring-1 ring-inset ring-slate-200/60 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 disabled:opacity-50"'
);

// Mobile buttons
code = code.replace(
  /className="app-touch-target inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2\.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"/g,
  'className="app-touch-target inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:pointer-events-none disabled:opacity-50"'
);
code = code.replace(
  /className="app-touch-target inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2\.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"/g,
  'className="app-touch-target inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider text-rose-600 shadow-sm ring-1 ring-inset ring-rose-200 transition-all hover:bg-rose-50 hover:shadow-md active:scale-95 disabled:pointer-events-none disabled:opacity-50"'
);

// Form updates in lists
code = code.replace(
  /className="mt-4 w-full rounded-xl px-3 py-2\.5 pr-10 focus:border-indigo-500 focus:ring-indigo-100"/g,
  'className="mt-4 w-full rounded-xl border border-slate-200/60 bg-slate-50/50 py-2.5 pl-4 pr-10 text-sm font-medium text-slate-900 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-indigo-500/20"'
);

fs.writeFileSync(file, code, 'utf8');
