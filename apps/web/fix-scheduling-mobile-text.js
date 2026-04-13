const fs = require('fs');

let file = 'src/app/(dashboard)/scheduling/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /<div className="relative z-10 flex items-center gap-3">\n\s*<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 shadow-inner text-indigo-600 border border-indigo-100">\n\s*<Calendar className="h-6 w-6" \/>\n\s*<\/div>\n\s*<div>\n\s*<h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Scheduling<\/h1>\n\s*<p className="text-sm font-medium text-slate-500 sm:text-base">Manage your booking pages and appointments<\/p>\n\s*<\/div>\n\s*<\/div>/g,
  `<div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-5 text-center sm:text-left w-full sm:w-auto">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 shadow-inner text-indigo-600 border border-indigo-100">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 mb-1 sm:mb-2">Scheduling</h1>
              <p className="text-sm sm:text-base font-medium text-slate-500 max-w-[280px] sm:max-w-none mx-auto sm:mx-0 leading-relaxed">Manage your booking pages and appointments</p>
            </div>
          </div>`
);

fs.writeFileSync(file, code, 'utf8');
