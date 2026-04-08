const fs = require('fs');
let code = fs.readFileSync('packages/ui/src/templates/CreativeTemplate.tsx', 'utf8');

const search = `function extractYouTubeId(url: string): string {`;
const idx = code.indexOf(search);

if (idx !== -1) {
  code = code.substring(0, idx);
  fs.writeFileSync('packages/ui/src/templates/CreativeTemplate.tsx', code);
  console.log('Success top strip');
} else {
  console.log('Not found');
}
