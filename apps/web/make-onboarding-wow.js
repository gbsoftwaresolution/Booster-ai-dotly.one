const fs = require('fs');

let file = 'src/app/onboarding/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Upgrade Background and Main Container
code = code.replace(
  /<div className="min-h-screen bg-\[radial-gradient\(circle_at_top,rgba\(14,165,233,0\.12\),transparent_28%\),linear-gradient\(180deg,#f8fbff_0%,#ffffff_48%,#f8fafc_100%\)\] px-4 py-10 sm:px-6 lg:px-8">/g,
  '<div className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-sky-50 px-4 py-12 sm:px-6 lg:px-8">\n      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-400/10 blur-[100px]" />\n      <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-sky-400/10 blur-[100px]" />'
);

code = code.replace(
  /<div className="mx-auto max-w-4xl space-y-8">/g,
  '<div className="mx-auto max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out fill-mode-both relative z-10">'
);

// 2. Enhance Header
code = code.replace(
  /<div className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-\[11px\] font-semibold uppercase tracking-\[0\.22em\] text-sky-600">/g,
  '<div className="inline-flex items-center rounded-full bg-indigo-50/80 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-600 ring-1 ring-inset ring-indigo-500/20 backdrop-blur-sm">'
);

// 3. Step indicator cards (1. Profile, 2. First Card)
code = code.replace(
  /className=\{cn\(\n\s*'rounded-\[24px\] border px-4 py-4 text-left',\n\s*isActive \? 'border-sky-200 bg-sky-50\/70' : 'border-gray-200 bg-white',\n\s*\)\}/g,
  `className={cn(
                  'rounded-[24px] border px-6 py-5 text-left transition-all duration-500',
                  isActive ? 'border-indigo-200 bg-white/80 shadow-[0_8px_30px_-12px_rgba(79,70,229,0.2)] backdrop-blur-xl scale-[1.02] ring-1 ring-indigo-500/10' : 'border-white/60 bg-white/40 backdrop-blur-md opacity-70'
                )}`
);

// 4. Main Surface upgrades (Profile Step)
code = code.replace(
  /<div className="app-shell-surface rounded-\[32px\] p-6 sm:p-8">/g,
  '<div className="group relative overflow-hidden rounded-[40px] border border-white/60 bg-white/40 p-8 sm:p-12 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-700 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5">\n            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/10 pointer-events-none" />\n            <div className="relative z-10">'
);

// Close the inner div z-10 for step 1 properly
code = code.replace(
  /<\/div>\n\s*<\/div>\n\s*\) : \(/g,
  '            </div>\n          </div>\n        ) : ('
);

// Ensure the same app-shell-surface replacement catches the Card step too
code = code.replace(
  /<div className="app-shell-surface rounded-\[32px\] p-6 sm:p-8">/g,
  '<div className="group relative overflow-hidden rounded-[40px] border border-white/60 bg-white/40 p-8 sm:p-12 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-700 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5">\n            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/10 pointer-events-none" />\n            <div className="relative z-10">'
);

// Close the inner div z-10 for step 2 properly
code = code.replace(
  /<\/div>\n\s*<\/div>\n\s*\}\n\s*<\/div>\n\s*<\/div>/g,
  '            </div>\n          </div>\n        )}\n      </div>\n    </div>'
);

// 5. Why country matters info box
code = code.replace(
  /<div className="rounded-\[28px\] border border-sky-100 bg-sky-50\/70 p-5 text-sm text-sky-900">/g,
  '<div className="rounded-[32px] border border-indigo-100/50 bg-gradient-to-br from-indigo-50/50 to-sky-50/50 p-6 text-sm text-indigo-900 shadow-inner backdrop-blur-md relative overflow-hidden">\n                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/40 blur-2xl" />'
);

// 6. Template cards
code = code.replace(
  /className=\{cn\(\n\s*'rounded-\[24px\] border px-5 py-5 text-left transition',\n\s*active\n\s*\? 'border-sky-300 bg-sky-50 shadow-sm'\n\s*: 'border-gray-200 bg-white hover:border-gray-300',\n\s*\)\}/g,
  `className={cn(
                      'group/card relative overflow-hidden rounded-[32px] border px-6 py-6 text-left transition-all duration-500',
                      active
                        ? 'border-indigo-400 bg-white/80 shadow-[0_10px_40px_-10px_rgba(79,70,229,0.2)] scale-[1.02] ring-1 ring-indigo-500/20'
                        : 'border-white/60 bg-white/40 hover:bg-white/60 hover:shadow-lg hover:-translate-y-1 backdrop-blur-xl'
                    )}`
);

// 7. Buttons
code = code.replace(
  /className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"/g,
  'className="group/btn relative overflow-hidden rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-extrabold text-white shadow-[0_0_20px_-5px_rgba(79,70,229,0.4)] transition-all duration-500 hover:scale-105 hover:bg-indigo-500 hover:shadow-[0_0_40px_-10px_rgba(79,70,229,0.7)] active:scale-95 ring-1 ring-indigo-500/50 disabled:opacity-50 disabled:hover:scale-100"'
);

// We need to inject the shimmer span into the Profile Continue button
code = code.replace(
  /\{profileSaving \? 'Saving profile\.\.\.' : 'Continue to first card'\}/g,
  '<div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover/btn:translate-x-[200%]" />\n                  <span className="relative z-10">{profileSaving ? "Saving profile..." : "Continue to first card"}</span>'
);

code = code.replace(
  /className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"/g,
  'className="group/btn relative overflow-hidden rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-extrabold text-white shadow-[0_0_20px_-5px_rgba(79,70,229,0.4)] transition-all duration-500 hover:scale-105 hover:bg-indigo-500 hover:shadow-[0_0_40px_-10px_rgba(79,70,229,0.7)] active:scale-95 ring-1 ring-indigo-500/50 disabled:opacity-50 disabled:hover:scale-100"'
);

// We need to inject the shimmer span into the Create Card button
code = code.replace(
  /\{cardSaving\n\s*\? 'Creating your first card\.\.\.'\n\s*: 'Create first card and enter dashboard'\}/g,
  '<div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover/btn:translate-x-[200%]" />\n                <span className="relative z-10">{cardSaving ? "Creating your first card..." : "Create first card and enter dashboard"}</span>'
);


fs.writeFileSync(file, code, 'utf8');
