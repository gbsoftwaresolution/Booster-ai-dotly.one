const fs = require('fs');

const pagePath = 'apps/web/src/app/(dashboard)/settings/billing/page.tsx';
let code = fs.readFileSync(pagePath, 'utf8');

const lastPart = code.substring(code.indexOf('<UpgradePlanCard'));

// Let's find exactly the end of the UpgradePlanCard component (which is `/>` or `/>\n`)
const upgradePlanEnd = lastPart.indexOf('/>') + 2;

const replaceWith = lastPart.substring(0, upgradePlanEnd) + `
          </div>
        </div>
      )}
    </div>
  )
}
`;

code = code.substring(0, code.indexOf('<UpgradePlanCard')) + replaceWith;

fs.writeFileSync(pagePath, code);
