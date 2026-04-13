const fs = require('fs')
const file = 'src/app/(dashboard)/deals/components.tsx'
let code = fs.readFileSync(file, 'utf8')

// The new deal modal UI
code = code.replace(
  '<div\n        ref={modalRef}\n        role="dialog"\n        aria-modal="true"\n        aria-labelledby="create-deal-title"\n        className="relative mx-auto w-full max-w-lg rounded-[28px] bg-white p-6 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] sm:container"',
  '<div\n        ref={modalRef}\n        role="dialog"\n        aria-modal="true"\n        aria-labelledby="create-deal-title"\n        className="relative mx-auto w-full max-w-lg rounded-[36px] bg-white/95 p-8 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"'
)

// Edit modal too
code = code.replace(
  '<div\n        ref={modalRef}\n        role="dialog"\n        aria-modal="true"\n        aria-labelledby="edit-deal-title"\n        className="relative mx-auto w-full max-w-lg rounded-[28px] bg-white p-6 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] sm:container"',
  '<div\n        ref={modalRef}\n        role="dialog"\n        aria-modal="true"\n        aria-labelledby="edit-deal-title"\n        className="relative mx-auto w-full max-w-lg rounded-[36px] bg-white/95 p-8 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"'
)

code = code.replace(
  /className="h-5 w-5 text-gray-400" \/>\n\s*<\/button>/g,
  'className="h-5 w-5 text-gray-500 transition-transform hover:scale-110" />\n        </button>'
)

code = code.replace(
  /text-xl font-bold text-gray-900 sm:text-2xl/g,
  'text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]'
)

code = code.replace(
  /className="mt-6 flex justify-end gap-3"/g,
  'className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-6"'
)

code = code.replace(
  /className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 active:scale-95"/g,
  'className="rounded-2xl px-6 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95"'
)

code = code.replace(
  /className="flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:pointer-events-none disabled:opacity-60"/g,
  'className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-60"'
)

fs.writeFileSync(file, code, 'utf8')
