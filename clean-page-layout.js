const fs = require('fs');

const pagePath = 'apps/web/src/app/(dashboard)/settings/billing/page.tsx';
let page = fs.readFileSync(pagePath, 'utf8');

// Replace <CurrentPlanCard ... /> to Refund and History Link.
// Actually, let's just make the simple wrap using AST-like robust string matching of the start of the block and the end.
const loadingBlockStart = "{loading ? (\n        <BillingLoadingState />\n      ) : (\n        <>";
const targetStart = `{loading ? (
        <BillingLoadingState />
      ) : (
        <div className="flex flex-col xl:flex-row items-start gap-8 xl:gap-12 w-full mt-4 xl:mt-8">
          <div className="flex w-full flex-1 flex-col gap-8 sm:gap-12">`;

page = page.replace(loadingBlockStart, targetStart);

// At this point we opened `div.flex-col > div.flex-1`.
// We need to close `div.flex-1`, open `div.w-[400px]` around UpgradePlanCard, and close them both instead of `</>`.

// To do this, let's locate <UpgradePlanCard and inject the div closes/opens right above it.
page = page.replace(
  /\s*<UpgradePlanCard/g,
  `
          </div>
          <div className="w-full xl:w-[460px] 2xl:w-[500px] shrink-0 xl:sticky xl:top-24">
            <UpgradePlanCard`
);

// We need to move RefundCard into the flex-1 column (it's currently after UpgradePlanCard)
// And Transaction History Link is also after UpgradePlanCard.
// So let's extract them and move them above the `</div><div ... w-[460px] ...>` we just created!

page = page.replace(/<RefundCard[\s\S]*?\/>/g, "");
page = page.replace(/\{\/\* Transaction History Link instead of card \*\/\}[\s\S]*?<\/div>/g, "");

// Where to inject them? Just before `</div> <div className="w-full xl:w-[460px]...`
const injectPoint = `          </div>
          <div className="w-full xl:w-[460px] 2xl:w-[500px] shrink-0 xl:sticky xl:top-24">
            <UpgradePlanCard`;

const injectPayload = `
            <RefundCard
              subscription={subscription}
              refunding={refunding}
              requestingManualReview={requestingManualRefund}
              onRequestRefund={() => void handleRequestRefund()}
              onRequestManualReview={() => void handleRequestManualRefund()}
            />

            {/* Transaction History Link instead of card */}
            <div className="mt-8 flex justify-end">
              <Link
                href="/settings/billing/history"
                className="inline-flex items-center gap-2 rounded-xl bg-white/60 px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300/50 hover:bg-gray-50/80 transition-all hover:ring-gray-300"
              >
                <Activity className="h-4 w-4 text-brand-500" />
                View Transaction History
              </Link>
            </div>
          </div>
          <div className="w-full xl:w-[460px] 2xl:w-[500px] shrink-0 xl:sticky xl:top-24">
            <UpgradePlanCard`;

page = page.replace(injectPoint, injectPayload);

// Finally, replace the closing `</>` with `</div>`
page = page.replace(/<\/>/g, '</div>');

fs.writeFileSync(pagePath, page);
console.log('Done replacement.');
