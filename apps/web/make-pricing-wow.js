const fs = require('fs');

let file = 'src/app/pricing/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Marketing Shell & Page Background
// Let's add top-level elegant glow blobs
code = code.replace(
  /<div className="marketing-shell min-h-screen bg-transparent">/g,
  '<div className="marketing-shell relative min-h-screen overflow-hidden bg-slate-50/50">\n      <div className="absolute left-1/2 top-0 -translate-x-1/2 -top-40 h-[600px] w-[800px] rounded-full bg-gradient-to-br from-indigo-400/20 to-sky-300/20 blur-[120px] pointer-events-none" />\n      <div className="absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full bg-sky-400/10 blur-[100px] pointer-events-none" />\n      <div className="absolute left-0 bottom-1/4 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />'
);

// 2. Hero Section
code = code.replace(
  /<div className="app-shell-surface inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-sky-700">/g,
  '<div className="inline-flex items-center gap-2 rounded-full border border-sky-200/50 bg-sky-50/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-sky-700 backdrop-blur-md shadow-sm">'
);

code = code.replace(
  /<h1 className="mt-6 text-4xl font-extrabold tracking-\[-0\.04em\] text-gray-950 sm:text-5xl lg:text-6xl">/g,
  '<h1 className="mt-8 text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-600 sm:text-6xl lg:text-[4.5rem] leading-[1.1]">'
);

code = code.replace(
  /<p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-600">/g,
  '<p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl leading-relaxed text-gray-500 font-medium">'
);

code = code.replace(
  /<div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-600">/g,
  '<div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-gray-500">'
);

code = code.replace(
  /<span className="rounded-full border border-gray-200 bg-white\/80 px-3 py-1\.5">/g,
  '<span className="rounded-full border border-white/60 bg-white/40 px-4 py-2 shadow-sm backdrop-blur-md">'
);

// 3. Duration Toggle
code = code.replace(
  /<div className="app-shell-surface mt-10 inline-flex items-center gap-1 rounded-full p-1">/g,
  '<div className="mt-12 inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/40 p-1.5 shadow-sm backdrop-blur-xl ring-1 ring-black/5">'
);

// 4. Free Plan Box
code = code.replace(
  /<div className="app-panel rounded-\[32px\] px-6 py-6 sm:px-8">/g,
  '<div className="group relative overflow-hidden rounded-[32px] sm:rounded-[40px] border border-white/60 bg-white/40 px-6 py-8 sm:px-10 sm:py-10 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5">'
);

code = code.replace(
  /<span className="app-panel-subtle rounded-full px-3 py-1\.5">/g,
  '<span className="rounded-full border border-white/80 bg-white/60 px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur-md transition-colors group-hover:bg-white">'
);
// it occurs multiple times, changing to replace all via global regex but with different syntax 
code = code.replace(
  /<span className="app-panel-subtle/g,
  '<span className="rounded-full border border-white/80 bg-white/60 px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur-md transition-colors group-hover:bg-white '
);

code = code.replace(
  /<Link\n\s*href="\/auth\?next=%2Fdashboard"\n\s*className="app-panel-subtle inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-white"\n\s*>/g,
  '<Link\n                  href="/auth?next=%2Fdashboard"\n                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-900 shadow-sm transition-all hover:scale-[1.02] hover:bg-gray-50 hover:shadow active:scale-[0.98]"\n                >'
);

// 5. Pricing Cards
code = code.replace(
  /'relative overflow-hidden rounded-\[34px\] p-7 shadow-\[0_32px_90px_-44px_rgba\(15,23,42,0\.38\)\] backdrop-blur-xl',/g,
  `'group relative overflow-hidden rounded-[40px] p-8 sm:p-10 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-2 ring-1 ring-black/5',`
);

code = code.replace(
  /plan\.highlight\n\s*\? 'border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50'\n\s*: 'border border-white\/75 bg-white\/84',/g,
  `plan.highlight\n                      ? 'border border-indigo-200/60 bg-gradient-to-b from-indigo-50/80 to-white/90 shadow-[0_30px_60px_-15px_rgba(99,102,241,0.15)] hover:shadow-[0_40px_80px_-15px_rgba(99,102,241,0.25)]'\n                      : 'border border-white/60 bg-white/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)]',`
);

code = code.replace(
  /background: plan\.highlight\n\s*\? 'radial-gradient\(circle at top, rgba\(56,189,248,0\.22\), transparent 60%\)'\n\s*: 'radial-gradient\(circle at top, rgba\(148,163,184,0\.12\), transparent 60%\)',/g,
  `background: plan.highlight\n                        ? 'radial-gradient(circle at top, rgba(99,102,241,0.15), transparent 70%)'\n                        : 'radial-gradient(circle at top, rgba(148,163,184,0.08), transparent 70%)',`
);

code = code.replace(
  /<div className="absolute right-6 top-6 inline-flex items-center gap-1\.5 rounded-full bg-gray-950 px-3 py-1 text-xs font-semibold text-white">/g,
  '<div className="absolute right-8 top-8 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 backdrop-blur-md">'
);

code = code.replace(
  /<h2 className="text-xl font-semibold text-gray-950">\{plan\.name\}<\/h2>/g,
  '<h2 className="text-2xl font-bold tracking-tight text-gray-950">{plan.name}</h2>'
);

code = code.replace(
  /<span className="text-5xl font-bold tracking-tight text-gray-950">/g,
  '<span className="text-6xl font-extrabold tracking-tight text-gray-950">'
);

code = code.replace(
  /\{plan\.features\.map\(\(feature\) => \(\n\s*<li key=\{feature\} className="flex items-start gap-3">/g,
  '{plan.features.map((feature) => (\n                      <li key={feature} className="flex items-start gap-3 transition-colors group-hover:text-gray-900">'
);

code = code.replace(
  /<span className="mt-0\.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-500">/g,
  '<span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-sm">'
);

code = code.replace(
  /plan\.highlight\n\s*\? 'bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-\[0_22px_45px_-24px_rgba\(14,165,233,0\.72\)\] hover:brightness-\[1\.03\]'\n\s*: 'border border-brand-200 bg-white text-brand-700 hover:bg-brand-50',/g,
  `plan.highlight\n                        ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-[0_20px_40px_-12px_rgba(99,102,241,0.5)] hover:scale-[1.02] hover:shadow-[0_25px_50px_-12px_rgba(99,102,241,0.6)] active:scale-[0.98] border border-indigo-400/20'\n                        : 'bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98]',`
);

// 6. Feature Comparison Table
code = code.replace(
  /<div className="app-panel mt-8 overflow-x-auto rounded-\[32px\]">/g,
  '<div className="mt-12 overflow-hidden rounded-[40px] border border-white/60 bg-white/40 p-2 sm:p-4 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] ring-1 ring-black/5">\n            <div className="overflow-x-auto overflow-y-hidden rounded-[32px] bg-white/60 shadow-inner">'
);

code = code.replace(
  /<\/table>\n\s*<\/div>/g,
  '</table>\n            </div>\n          </div>'
);

code = code.replace(
  /<tr className="border-b border-gray-100 bg-gray-50\/80">/g,
  '<tr className="border-b border-gray-200/60 bg-gray-100/50 backdrop-blur-sm px-4">'
);

code = code.replace(
  /className=\{cn\(index % 2 === 0 \? 'bg-white' : 'bg-gray-50\/35'\)\}/g,
  'className={cn(\n                      "transition-colors duration-200 hover:bg-white/80",\n                      index % 2 === 0 ? "bg-white/40" : "bg-gray-50/20"\n                    )}'
);

// 7. Billing Clarity
code = code.replace(
  /<section className="border-t border-gray-100 bg-gray-50\/75 px-6 py-12 text-center">/g,
  '<section className="relative px-6 py-20 text-center overflow-hidden">\n        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/80 pointer-events-none" />'
);

code = code.replace(
  /<div className="app-panel mx-auto flex max-w-2xl flex-col items-center rounded-\[30px\] px-6 py-8">/g,
  '<div className="relative z-10 group mx-auto flex max-w-2xl flex-col items-center rounded-[40px] border border-white/60 bg-white/40 px-8 py-12 sm:px-12 sm:py-16 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5">'
);

code = code.replace(
  /<span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">/g,
  '<span className="mb-6 flex h-16 w-16 items-center justify-center rounded-[24px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white text-indigo-600 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">'
);

fs.writeFileSync(file, code, 'utf8');
