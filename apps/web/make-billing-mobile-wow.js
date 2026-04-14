const fs = require('fs');

let file = 'src/app/(dashboard)/settings/billing/components.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Upgrade BillingHero to World Class Glass & Fluid Mobile
code = code.replace(
  /<div className="app-panel relative overflow-hidden rounded-\[34px\] px-6 py-6 sm:px-8 sm:py-7">/g,
  '<div className="group relative overflow-hidden rounded-[32px] sm:rounded-[40px] border border-white/60 bg-white/40 px-5 py-8 sm:p-10 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-700 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5">'
);

code = code.replace(
  /className="absolute inset-0 opacity-90"\n\s*aria-hidden="true"\n\s*style=\{\{\n\s*background:\n\s*'radial-gradient\(circle at top left, rgba\(14,165,233,0\.12\), transparent 34%\), radial-gradient\(circle at right center, rgba\(99,102,241,0\.10\), transparent 28%\), linear-gradient\(135deg, rgba\(255,255,255,0\.94\), rgba\(248,250,252,0\.98\)\)',\n\s*\}\}\n\s*\/>/g,
  'className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-sky-500/5 pointer-events-none" aria-hidden="true" />\n      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-400/10 blur-[100px] pointer-events-none" />\n      <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-sky-400/10 blur-[100px] pointer-events-none" />'
);

code = code.replace(
  /<div className="relative grid gap-5 xl:grid-cols-\[1\.35fr_0\.92fr\] xl:items-start">/g,
  '<div className="relative z-10 flex flex-col gap-8 xl:grid xl:grid-cols-[1.35fr_0.92fr] xl:items-start">'
);

code = code.replace(
  /<div>\n\s*<div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-\[11px\] font-semibold uppercase tracking-\[0\.22em\] text-sky-600">/g,
  '<div className="flex flex-col items-center xl:items-start text-center xl:text-left">\n          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50/80 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-600 ring-1 ring-inset ring-indigo-500/20 backdrop-blur-sm">'
);

code = code.replace(
  /<h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-\[2rem\]">/g,
  '<h1 className="mt-4 text-[28px] font-extrabold tracking-tight text-gray-950 sm:text-[2rem] leading-tight">'
);

code = code.replace(
  /<p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-\[15px\]">/g,
  '<p className="mt-3 max-w-[280px] sm:max-w-2xl text-sm sm:text-base font-medium text-gray-500 leading-relaxed mx-auto xl:mx-0">'
);

code = code.replace(
  /<div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">/g,
  '<div className="mt-5 flex flex-wrap items-center justify-center xl:justify-start gap-2 text-xs font-medium text-gray-600">'
);

code = code.replace(
  /<span className="rounded-full border border-gray-200 bg-white\/85 px-3 py-1\.5">/g,
  '<span className="rounded-full border border-indigo-100 bg-white/60 px-4 py-2 shadow-sm backdrop-blur-md transition-colors hover:bg-white">'
);

code = code.replace(
  /<span className="rounded-full border border-gray-200 bg-white\/85 px-3 py-1\.5">/g,
  '<span className="rounded-full border border-indigo-100 bg-white/60 px-4 py-2 shadow-sm backdrop-blur-md transition-colors hover:bg-white">'
);
code = code.replace(
  /<span className="rounded-full border border-gray-200 bg-white\/85 px-3 py-1\.5">/g,
  '<span className="rounded-full border border-indigo-100 bg-white/60 px-4 py-2 shadow-sm backdrop-blur-md transition-colors hover:bg-white">'
);

code = code.replace(
  /<div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">/g,
  '<div className="mt-8 grid w-full max-w-sm sm:max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">'
);

code = code.replace(
  /className="rounded-\[22px\] border border-white\/80 bg-white\/85 px-3 py-3 shadow-\[0_20px_40px_-32px_rgba\(15,23,42,0\.2\)\]"/g,
  'className="flex flex-col items-center xl:items-start rounded-[24px] border border-white/80 bg-white/60 px-4 py-4 shadow-sm backdrop-blur-md transition-transform duration-500 hover:-translate-y-1 hover:bg-white/80 hover:shadow-md ring-1 ring-black/5 text-center xl:text-left"'
);

code = code.replace(
  /<p className="text-\[10px\] font-semibold uppercase tracking-\[0\.18em\] text-gray-400">/g,
  '<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">'
);

code = code.replace(
  /<p className="mt-1 text-sm font-bold text-gray-900 sm:text-base">\{value\}<\/p>/g,
  '<p className="mt-1.5 text-base sm:text-lg font-extrabold text-gray-900">{value}</p>'
);

code = code.replace(
  /<div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white\/90 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">/g,
  '<div className="mt-6 inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2.5 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur-md transition-all hover:bg-white active:scale-95">'
);

code = code.replace(
  /<div className="app-panel-subtle rounded-\[30px\] p-4 sm:p-5">/g,
  '<div className="relative overflow-hidden rounded-[32px] border border-indigo-100/50 bg-gradient-to-br from-indigo-50/60 to-sky-50/60 p-6 sm:p-8 shadow-inner backdrop-blur-md">'
);

code = code.replace(
  /<p className="text-xs font-semibold uppercase tracking-\[0\.22em\] text-gray-400">\n\s*Billing Snapshot\n\s*<\/p>\n\s*<p className="mt-1 text-sm font-semibold text-gray-900">\n\s*Subscription health at a glance\n\s*<\/p>/g,
  '<p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-600">\n                Billing Snapshot\n              </p>\n              <p className="mt-1.5 text-base font-extrabold text-indigo-950">\n                Subscription health at a glance\n              </p>'
);

code = code.replace(
  /<span className="rounded-full bg-white px-2\.5 py-1 text-\[10px\] font-semibold uppercase tracking-wide text-sky-600 shadow-sm">/g,
  '<span className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 shadow-sm border border-indigo-100"><span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />'
);

code = code.replace(
  /className="flex items-center gap-3 rounded-\[24px\] border border-white\/80 bg-white\/80 px-4 py-3"/g,
  'className="group/snapshot flex items-center gap-4 rounded-[24px] border border-white/60 bg-white/60 px-5 py-4 shadow-sm backdrop-blur-lg transition-all duration-300 hover:scale-[1.02] hover:bg-white hover:shadow-md"'
);

fs.writeFileSync(file, code, 'utf8');
