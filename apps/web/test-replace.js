const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/leads/components.tsx', 'utf8');
console.log(content.includes('bg-slate-900 px-8'));
let matches = content.match(/bg-slate-[0-9]+/g);
console.log(matches);
