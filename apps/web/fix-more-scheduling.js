const fs = require('fs');

const files = [
  'src/app/(dashboard)/scheduling/page.tsx',
  'src/app/(dashboard)/scheduling/components.tsx',
  'src/app/(dashboard)/scheduling/helpers.ts'
];

for(const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // Text colors
  code = code.replace(/text-gray-900/g, 'text-slate-900');
  code = code.replace(/text-gray-800/g, 'text-slate-800');
  code = code.replace(/text-gray-700/g, 'text-slate-700');
  code = code.replace(/text-gray-600/g, 'text-slate-600');
  code = code.replace(/text-gray-500/g, 'text-slate-500');
  code = code.replace(/text-gray-400/g, 'text-slate-400');
  code = code.replace(/text-gray-300/g, 'text-slate-300');
  code = code.replace(/text-gray-200/g, 'text-slate-200');

  // Border colors
  code = code.replace(/border-gray-900/g, 'border-slate-900');
  code = code.replace(/border-gray-300/g, 'border-slate-300');
  code = code.replace(/border-gray-200/g, 'border-slate-200/60');
  code = code.replace(/border-gray-100/g, 'border-slate-100');

  // Background colors
  code = code.replace(/bg-gray-900/g, 'bg-slate-900');
  code = code.replace(/bg-gray-800/g, 'bg-slate-800');
  code = code.replace(/bg-gray-200/g, 'bg-slate-200');
  code = code.replace(/bg-gray-100/g, 'bg-slate-100');
  code = code.replace(/bg-gray-50/g, 'bg-slate-50');

  // Hover background colors
  code = code.replace(/hover:bg-gray-100/g, 'hover:bg-slate-100');
  code = code.replace(/hover:bg-gray-50/g, 'hover:bg-slate-50');

  // Any other legacy wrappers in components
  code = code.replace(/className="app-dialog-shell"/g, 'className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-md transition-all sm:p-6"');
  code = code.replace(/className="app-dialog-panel max-w-lg"/g, 'className="relative mx-auto w-full max-w-lg my-8 rounded-[32px] bg-white/95 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"');
  code = code.replace(/className="app-dialog-panel max-w-2xl"/g, 'className="relative mx-auto w-full max-w-2xl my-8 rounded-[32px] bg-white/95 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"');
  code = code.replace(/className="app-dialog-panel max-w-xl"/g, 'className="relative mx-auto w-full max-w-xl my-8 rounded-[32px] bg-white/95 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"');
  code = code.replace(/className="app-dialog-panel max-w-md"/g, 'className="relative mx-auto w-full max-w-md my-8 rounded-[32px] bg-white/95 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"');
  code = code.replace(/className="app-dialog-panel"/g, 'className="relative mx-auto w-full my-8 rounded-[32px] bg-white/95 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"');
  
  code = code.replace(/className="app-modal-header"/g, 'className="flex items-start justify-between border-b border-slate-100 px-8 py-6"');
  code = code.replace(/className="app-dialog-footer"/g, 'className="sticky bottom-0 mt-4 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/50 p-6 backdrop-blur-md rounded-b-[32px]"');
  code = code.replace(/className="app-dialog-body-scroll space-y-4"/g, 'className="app-dialog-body-scroll px-8 py-6 custom-scrollbar max-h-[60vh] overflow-y-auto space-y-6"');
  
  // Magic inputs
  code = code.replace(/className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"/g, 'className="w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20"');
  code = code.replace(/className="mb-1 block text-sm font-medium text-slate-700"/g, 'className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"');
  
  fs.writeFileSync(file, code, 'utf8');
}
