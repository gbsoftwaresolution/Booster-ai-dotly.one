const fs = require('fs');

let file = 'src/app/(dashboard)/deals/components.tsx';
let code = fs.readFileSync(file, 'utf8');

// Dialog Shells
code = code.replace(
  /className="app-dialog-shell"/g,
  'className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-md transition-all sm:p-6"'
);
code = code.replace(
  /className="app-dialog-panel max-w-lg"/g,
  'className="relative mx-auto w-full max-w-lg my-8 rounded-[32px] bg-white/95 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"'
);

// Headers and Body
code = code.replace(
  /className="app-modal-header"/g,
  'className="flex items-start justify-between border-b border-slate-100 px-8 py-6"'
);
code = code.replace(
  /className="text-lg font-bold text-gray-900"/g,
  'className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]"'
);
code = code.replace(
  /className="app-touch-target rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"/g,
  'className="app-touch-target flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"'
);

code = code.replace(
  /className="app-modal-body app-dialog-body-scroll space-y-4"/g,
  'className="app-dialog-body-scroll px-8 py-6 custom-scrollbar max-h-[60vh] overflow-y-auto space-y-6"'
);

// Labels & Inputs
code = code.replace(
  /className="mb-1 block text-sm font-medium text-gray-700"/g,
  'className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"'
);
code = code.replace(
  /className="mb-1 block text-sm font-medium text-gray-500"/g,
  'className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"'
);
code = code.replace(
  /className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"/g,
  'className="w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20"'
);

// Selected Contact Display
code = code.replace(
  /className="flex items-center justify-between rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2"/g,
  'className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3"'
);

// Dropdown suggestions
code = code.replace(
  /className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm"/g,
  'className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200/60 bg-white/90 shadow-md backdrop-blur-xl custom-scrollbar"'
);

// Footer
code = code.replace(
  /className="app-dialog-footer"/g,
  'className="sticky bottom-0 mt-4 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/50 p-6 backdrop-blur-md rounded-b-[32px]"'
);
code = code.replace(
  /className="app-touch-target w-full rounded-lg border border-gray-200 px-4 py-2\.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"/g,
  'className="w-full rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 sm:w-auto active:scale-95"'
);
code = code.replace(
  /className="app-touch-target w-full rounded-lg bg-indigo-600 px-4 py-2\.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"/g,
  'className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"'
);

// Contact Edit Specifics (Selects)
code = code.replace(
  /className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"/g,
  'className="w-full appearance-none rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20"'
);

fs.writeFileSync(file, code, 'utf8');
