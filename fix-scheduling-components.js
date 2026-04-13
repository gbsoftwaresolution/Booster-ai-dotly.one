const fs = require('fs');

let file = 'src/app/(dashboard)/scheduling/components.tsx';
let code = fs.readFileSync(file, 'utf8');

// Dial up background of CenteredDialogShell
code = code.replace(
  /className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"/g,
  'className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 sm:p-6 backdrop-blur-md transition-all custom-scrollbar"'
);

// Update CenteredDialogShell inner panel
code = code.replace(
  /className=\{`app-panel flex max-h-\[90vh\] w-full flex-col rounded-\[28px\] shadow-2xl \$\{className\}`\}/g,
  'className={`relative mx-auto flex w-full max-h-[90vh] flex-col overflow-hidden rounded-[32px] bg-white/95 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container ${className}`}'
);

// Form / Modal typography matching pipelines & deals
code = code.replace(
  /className="text-lg font-semibold text-slate-900"/g,
  'className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]"'
);
code = code.replace(
  /className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 p-5"/g,
  'className="flex flex-shrink-0 items-start justify-between border-b border-slate-100 px-8 py-6"'
);
code = code.replace(
  /className="app-touch-target rounded-lg p-2 hover:bg-slate-100"/g,
  'className="app-touch-target flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"'
);
code = code.replace(
  /className="rounded-lg p-1\.5 hover:bg-slate-100"/g,
  'className="app-touch-target flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"'
);
code = code.replace(
  /className="app-dialog-body-scroll space-y-4 p-5"/g,
  'className="app-dialog-body-scroll px-8 py-6 custom-scrollbar max-h-[60vh] overflow-y-auto space-y-6"'
);
code = code.replace(
  /className="flex-1 space-y-4 overflow-y-auto p-5"/g,
  'className="flex-1 px-8 py-6 custom-scrollbar overflow-y-auto space-y-6"'
);

// Standardizing footer buttons correctly
code = code.replace(
  /className="sticky bottom-0 mt-4 flex items-center justify-end gap-3 border-t border-slate-100 bg-white\/50 p-6 backdrop-blur-md rounded-b-\[32px\]"/g,
  'className="sticky bottom-0 z-10 flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white/50 p-6 backdrop-blur-md rounded-b-[32px] mt-auto"'
);
code = code.replace(
  /className="app-touch-target w-full rounded-lg border border-slate-200\/60 px-4 py-2\.5 text-sm hover:bg-slate-50 sm:w-auto"/g,
  'className="w-full rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 sm:w-auto active:scale-95"'
);
code = code.replace(
  /className="app-touch-target w-full rounded-lg bg-sky-600 px-4 py-2\.5 text-sm font-medium text-white hover:bg-sky-700 sm:w-auto"/g,
  'className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"'
);

// Missing form footer inside the AptType form which doesn't use the exact dialog-footer string.
code = code.replace(
  /<div className="flex flex-shrink-0 justify-end gap-2 border-t border-slate-100 p-4">/g,
  '<div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white/50 p-6 backdrop-blur-md rounded-b-[32px] mt-auto">'
);
code = code.replace(
  /className="app-touch-target rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"/g,
  'className="w-full rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 sm:w-auto active:scale-95"'
);
code = code.replace(
  /className="app-touch-target inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"/g,
  'className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"'
);
code = code.replace(
  /className="flex max-h-\[90vh\] w-full flex-col rounded-\[28px\]"/g,
  'className="relative mx-auto flex w-full max-h-[90vh] flex-col overflow-hidden rounded-[32px] bg-white/95 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"'
);

// Inputs update to standard form
code = code.replace(
  /const baseClass = "w-full rounded-lg border px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2"/g,
  'const baseClass = "w-full rounded-2xl border bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:bg-white focus:ring-[3px] focus:outline-none"'
);
code = code.replace(
  /const normalBorder = 'border-slate-300 focus:border-sky-500 focus:ring-sky-500\/20'/g,
  'const normalBorder = \'border-slate-200/60 focus:border-indigo-500 focus:ring-indigo-500/20\''
);
code = code.replace(
  /const errorBorder = 'border-red-300 focus:border-red-500 focus:ring-red-500\/20'/g,
  'const errorBorder = \'border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900\''
);


fs.writeFileSync(file, code, 'utf8');
