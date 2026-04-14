const fs = require('fs');
let code = fs.readFileSync('apps/web/src/app/(dashboard)/settings/billing/page.tsx', 'utf8');

// The end looks like:
//         </div>
//       )}
//     </div>

// I just need to add a closing div before `\n      )}`
code = code.replace(/\n\s*\}\)\}\n\s*<\/div>\n\s*\)\n\s*\}/, '\n        </div>\n      )}\n    </div>\n  )\n}');
fs.writeFileSync('apps/web/src/app/(dashboard)/settings/billing/page.tsx', code);
