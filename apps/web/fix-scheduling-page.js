const fs = require('fs');

let file = 'src/app/(dashboard)/scheduling/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Global Background and Card changes
code = code.replace(/className="app-panel /g, 'className="');
code = code.replace(/className="app-panel-subtle /g, 'className="');

// Modern Hero header
code = code.replace(
  /className="flex flex-col gap-5 rounded-\[30px\] px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8"/g,
  'className="relative overflow-hidden rounded-[32px] border border-slate-200/60 bg-white/60 p-6 sm:p-8 backdrop-blur-xl shadow-sm mb-6"'
);

// Gradient Background to hero
code = code.replace(
  /<div className="flex items-center gap-3">/g,
  '<div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none" style={{ backgroundImage: \'radial-gradient(circle at center, #94a3b8 1px, transparent 1px)\', backgroundSize: \'24px 24px\' }} />\n          <div className="relative z-10 flex items-center gap-3">'
);

// Hero Icon and Text to Magic Style
code = code.replace(
  /className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500\/10 text-sky-600"/g,
  'className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 shadow-inner text-indigo-600 border border-indigo-100"'
);
code = code.replace(
  /className="text-2xl font-bold text-gray-900"/g,
  'className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"'
);
code = code.replace(
  /className="text-sm text-gray-500"/g,
  'className="text-sm font-medium text-slate-500 sm:text-base"'
);

// Primary Call to Action Button
code = code.replace(
  /className="flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"/g,
  'className="relative z-10 flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 sm:w-auto"'
);
code = code.replace(
  /className="mt-4 flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2\.5 text-sm font-medium text-white transition hover:bg-sky-700"/g,
  'className="mt-6 flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 sm:w-auto mx-auto max-w-xs"'
);

// Google Calendar Sync Indicator
code = code.replace(
  /className="flex items-center gap-3 rounded-\[24px\] px-4 py-3"/g,
  'className="flex items-center gap-3 rounded-[24px] border border-sky-100 bg-sky-50/50 px-5 py-4 backdrop-blur-md shadow-inner"'
);
code = code.replace(
  /className="text-sm font-medium text-gray-700"/g,
  'className="text-sm font-bold uppercase tracking-wider text-slate-600"'
);
code = code.replace(
  /className="ml-2 text-xs text-gray-400"/g,
  'className="ml-2 text-sm font-medium text-slate-500"'
);

// Disconnect / Connect Google Calendar buttons
code = code.replace(
  /className="rounded-lg border border-gray-200 px-3 py-1\.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"/g,
  'className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-50 hover:border-rose-200 active:scale-95 disabled:opacity-50"'
);
code = code.replace(
  /className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1\.5 text-xs font-medium text-amber-700 hover:bg-amber-100"/g,
  'className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-[13px] font-bold text-amber-700 shadow-sm transition-all hover:bg-amber-100 active:scale-95"'
);
code = code.replace(
  /className="rounded-lg bg-sky-600 px-3 py-1\.5 text-xs font-medium text-white hover:bg-sky-700"/g,
  'className="rounded-xl bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95"'
);

// Tab Pill Switching (Appointments vs Integrations)
code = code.replace(
  /className="flex w-fit gap-1 rounded-\[20px\] p-1\.5"/g,
  'className="flex w-fit gap-1 rounded-2xl bg-white/50 p-1.5 shadow-sm border border-slate-200/60 backdrop-blur-xl mb-6"'
);
code = code.replace(
  /className=\{`rounded-2xl px-4 py-2\.5 text-sm font-medium transition-colors \$\{tab === t \? 'bg-white text-gray-900 shadow-sm ring-1 ring-white\/80' : 'text-gray-500 hover:text-gray-700'}`\}/g,
  'className={`relative rounded-[14px] px-6 py-2.5 text-sm font-bold transition-all ${tab === t ? \'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/60\' : \'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50\'}`}'
);

// Empty state
code = code.replace(
  /className="app-empty-state"/g,
  'className="relative mx-auto mt-8 max-w-2xl overflow-hidden rounded-[32px] border border-slate-200/60 bg-white/60 p-12 text-center shadow-sm backdrop-blur-xl"'
);
code = code.replace(
  /className="mb-4 h-12 w-12 text-slate-300"/g,
  'className="mx-auto mb-6 h-20 w-20 text-sky-400 opacity-80 drop-shadow-sm"'
);
code = code.replace(
  /className="text-gray-600"/g,
  'className="text-xl font-extrabold text-slate-900 mb-2"'
);
code = code.replace(
  /className="mt-2 max-w-md text-sm text-gray-400"/g,
  'className="mx-auto max-w-sm text-sm font-medium text-slate-500 mb-8"'
);

// Select Card / Settings Option
code = code.replace(
  /className="flex flex-col gap-3 rounded-\[24px\] px-4 py-3 sm:flex-row sm:items-center"/g,
  'className="flex flex-col gap-4 rounded-[24px] border border-slate-200/60 bg-white/60 p-5 backdrop-blur-xl sm:flex-row sm:items-center"'
);
code = code.replace(
  /className="text-sm font-medium text-gray-600"/g,
  'className="text-sm font-bold uppercase tracking-wider text-slate-500"'
);

// Appointment List Card
code = code.replace(
  /className="rounded-\[28px\] p-5 sm:p-6"/g,
  'className="group relative flex flex-col gap-4 rounded-[32px] border border-slate-200/60 bg-white/70 p-6 backdrop-blur-2xl transition-all hover:-translate-y-1 hover:shadow-xl hover:bg-white"'
);

fs.writeFileSync(file, code, 'utf8');
