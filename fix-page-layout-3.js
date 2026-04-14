const fs = require('fs');

const pagePath = 'apps/web/src/app/(dashboard)/settings/billing/page.tsx';
let code = fs.readFileSync(pagePath, 'utf8');

// Remove the erroneous 2nd column around RefundCard.
// The code looks like this:
/*
          </div>
          <div className="w-full xl:w-[460px] 2xl:w-[500px] shrink-0 xl:sticky xl:top-24">

            <RefundCard ...
*/

const badWrapper = `          </div>
          <div className="w-full xl:w-[460px] 2xl:w-[500px] shrink-0 xl:sticky xl:top-24">

            <RefundCard`;

const goodWrapper = `
            <RefundCard`;

code = code.replace(badWrapper, goodWrapper);

fs.writeFileSync(pagePath, code);
console.log('Fixed extraneous column.');
