const fs = require('fs');
let code = fs.readFileSync('apps/web/src/app/(dashboard)/settings/billing/page.tsx', 'utf8');

code = code.replace(/        <\/div>\s*\)\}\s*<\/div>\s*\)\s*\}/, '        </div>\n        </div>\n      )}\n    </div>\n  )\n}');
fs.writeFileSync('apps/web/src/app/(dashboard)/settings/billing/page.tsx', code);
