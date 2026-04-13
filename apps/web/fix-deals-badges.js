const fs = require('fs');

let file = 'src/app/(dashboard)/deals/helpers.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /PROSPECT: 'bg-blue-100 text-blue-700'/g,
  "PROSPECT: 'bg-sky-100/50 text-sky-700 ring-1 ring-inset ring-sky-500/20'"
);
code = code.replace(
  /PROPOSAL: 'bg-yellow-100 text-yellow-700'/g,
  "PROPOSAL: 'bg-amber-100/50 text-amber-700 ring-1 ring-inset ring-amber-500/20'"
);
code = code.replace(
  /NEGOTIATION: 'bg-purple-100 text-purple-700'/g,
  "NEGOTIATION: 'bg-indigo-100/50 text-indigo-700 ring-1 ring-inset ring-indigo-500/20'"
);
code = code.replace(
  /CLOSED_WON: 'bg-green-100 text-green-700'/g,
  "CLOSED_WON: 'bg-emerald-100/50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20'"
);
code = code.replace(
  /CLOSED_LOST: 'bg-red-100 text-red-700'/g,
  "CLOSED_LOST: 'bg-rose-100/50 text-rose-700 ring-1 ring-inset ring-rose-500/20'"
);

// STAGE_HEADER_COLORS
code = code.replace(
  /PROSPECT: 'bg-blue-50 border-blue-200'/g,
  "PROSPECT: 'bg-sky-50/50 border-sky-200/60'"
);
code = code.replace(
  /PROPOSAL: 'bg-yellow-50 border-yellow-200'/g,
  "PROPOSAL: 'bg-amber-50/50 border-amber-200/60'"
);
code = code.replace(
  /NEGOTIATION: 'bg-purple-50 border-purple-200'/g,
  "NEGOTIATION: 'bg-indigo-50/50 border-indigo-200/60'"
);
code = code.replace(
  /CLOSED_WON: 'bg-green-50 border-green-200'/g,
  "CLOSED_WON: 'bg-emerald-50/50 border-emerald-200/60'"
);
code = code.replace(
  /CLOSED_LOST: 'bg-red-50 border-red-200'/g,
  "CLOSED_LOST: 'bg-rose-50/50 border-rose-200/60'"
);

fs.writeFileSync(file, code, 'utf8');
