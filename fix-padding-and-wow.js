const fs = require('fs');

let file = 'src/app/(dashboard)/scheduling/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove redundant layout padding & height, add wow entry animation
code = code.replace(
  /<div className="min-h-screen p-4 sm:p-6">/g,
  '<div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out fill-mode-both">'
);

// 2. Expand max-width and space-y to look more breathable and grand
code = code.replace(
  /<div className="mx-auto max-w-5xl space-y-6">/g,
  '<div className="mx-auto w-full max-w-[1400px] space-y-8">'
);

// 3. Upgrade Header Container for WOW effect
code = code.replace(
  /<div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between overflow-hidden rounded-\[32px\] border border-slate-200\/60 bg-white\/60 p-6 sm:p-8 backdrop-blur-xl shadow-sm mb-6">/g,
  '<div className="group relative flex flex-col gap-6 overflow-hidden rounded-[40px] border border-white/60 bg-white/40 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-700 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] hover:bg-white/50 ring-1 ring-black/5">'
);

// 4. Update Header Gradient background subtly
code = code.replace(
  /<div className="absolute left-1\/2 top-1\/2 h-full w-full -translate-x-1\/2 -translate-y-1\/2 opacity-20 pointer-events-none" style=\{\{ backgroundImage: 'radial-gradient\(circle at center, #94a3b8 1px, transparent 1px\)', backgroundSize: '24px 24px' \}\} \/>/g,
  '<div className="absolute inset-0 transition-opacity duration-1000 opacity-20 group-hover:opacity-40 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at center, #94a3b8 1.5px, transparent 1.5px)", backgroundSize: "32px 32px" }} /><div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/10 pointer-events-none" />'
);

// 5. Enhance Button to match wow border
code = code.replace(
  /className="relative z-10 flex w-full sm:w-auto items-center justify-center gap-2 overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3\.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 sm:w-auto"/g,
  'className="relative z-10 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-extrabold text-white shadow-[0_0_20px_-5px_rgba(79,70,229,0.4)] transition-all duration-500 hover:scale-105 hover:bg-indigo-500 hover:shadow-[0_0_40px_-10px_rgba(79,70,229,0.7)] active:scale-95 sm:w-auto ring-1 ring-indigo-500/50 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent hover:before:translate-x-[200%] before:transition-transform before:duration-1000"'
);

// 6. Avatar square wow effect
code = code.replace(
  /<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 shadow-inner text-indigo-600 border border-indigo-100">/g,
  '<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-indigo-50 to-sky-50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_8px_16px_-6px_rgba(79,70,229,0.2)] text-indigo-600 border border-white ring-1 ring-indigo-100 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">'
);

fs.writeFileSync(file, code, 'utf8');
