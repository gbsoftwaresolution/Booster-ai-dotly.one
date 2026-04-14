const fs = require('fs');

const path = 'apps/web/src/app/(dashboard)/settings/billing/components.tsx';
let code = fs.readFileSync(path, 'utf8');

// The classes all end with `ring-1 ring-black/5">`
code = code.replace(/ring-1 ring-black\/5">/g, 'ring-1 ring-black/5 w-full min-w-0">');
// Since some had `w-full` already (if I did it before?), wait, I didn't.
code = code.replace(/w-full min-w-0 w-full min-w-0/g, 'w-full min-w-0');

fs.writeFileSync(path, code);
console.log('Fixed component wrapper widths.');
