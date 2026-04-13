const fs = require('fs');
let file = 'src/app/(dashboard)/scheduling/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /before:-translate-x-full hover:before:animate-\[shimmer_1\.5s_infinite\]"/g,
  'before:-translate-x-full hover:before:translate-x-[200%] before:transition-transform before:duration-1000"'
);

fs.writeFileSync(file, code, 'utf8');
