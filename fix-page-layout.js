const fs = require('fs');

const pagePath = 'apps/web/src/app/(dashboard)/settings/billing/page.tsx';
let pageCode = fs.readFileSync(pagePath, 'utf8');

// Replace the `<>` after loading with the layout wrapper
const oldStart = `
      {loading ? (
        <BillingLoadingState />
      ) : (
        <>
          <CurrentPlanCard`;

const newStart = `
      {loading ? (
        <BillingLoadingState />
      ) : (
        <div className="flex flex-col xl:flex-row items-start gap-8 xl:gap-12 w-full mt-8 sm:mt-12">
          <div className="flex-1 w-full space-y-8 sm:space-y-12">
          <CurrentPlanCard`;

pageCode = pageCode.replace(oldStart, newStart);

// Move RefundCard to be under CurrentPlanCard instead of under UpgradePlanCard
// Wait, currently the order is CurrentPlanCard, UpgradePlanCard, RefundCard.
// The easiest is matching the exact cards.
// But UpgradePlanCard spans like 50 lines.

// Let's do regex to extract the parts.
const currentPlanRegex = /<CurrentPlanCard[\s\S]*?\/>/;
const currentPlanMatch = pageCode.match(currentPlanRegex);
pageCode = pageCode.replace(currentPlanRegex, '');

const upgradePlanRegex = /<UpgradePlanCard[\s\S]*?billingCountry=\{billingCountry\}[\s\S]*?\/>/;
const upgradePlanMatch = pageCode.match(upgradePlanRegex);
pageCode = pageCode.replace(upgradePlanRegex, '');

const refundPlanRegex = /<RefundCard[\s\S]*?\/>/;
const refundPlanMatch = pageCode.match(refundPlanRegex);
pageCode = pageCode.replace(refundPlanRegex, '');

// There is also the `Transaction History Link instead of card`
const historyLinkRegex = /\{\/\* Transaction History Link instead of card \*\/\}[\s\S]*?<\/div>/;
const historyLinkMatch = pageCode.match(historyLinkRegex);
pageCode = pageCode.replace(historyLinkRegex, '');

// The `</>` at the end.
pageCode = pageCode.replace(/<\/>\s*\)\s*}\s*<\/div>/, '\n        </div>\n      )}\n    </div>');

// Insert them correctly.
let newLayout = `
      {loading ? (
        <BillingLoadingState />
      ) : (
        <div className="flex flex-col xl:flex-row items-start gap-8 xl:gap-12 w-full mt-8 sm:mt-0">
          <div className="flex-1 w-full space-y-8 sm:space-y-12">
            ${currentPlanMatch[0]}
            ${refundPlanMatch ? refundPlanMatch[0] : ''}
            ${historyLinkMatch ? historyLinkMatch[0] : ''}
          </div>
          
          <div className="w-full xl:w-[440px] 2xl:w-[480px] shrink-0 xl:sticky xl:top-28">
            ${upgradePlanMatch[0]}
          </div>
        </div>
      )}
    </div>`;

// Delete the old "      {loading ? ( ... " down to the end of the return
pageCode = pageCode.replace(/\{loading \? \([\s\S]*?<\/div>/, newLayout);

fs.writeFileSync(pagePath, pageCode);
console.log('Page layout fixed.');
