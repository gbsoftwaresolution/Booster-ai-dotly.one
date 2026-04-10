# Pricing Gate Checklist

Use this checklist whenever pricing, features, or billing behavior changes.

## Backend

- Update canonical limits in `apps/api/src/billing/billing.service.ts`
- Update card count enforcement in `apps/api/src/cards/cards.service.ts`
- Update analytics range enforcement in `apps/api/src/analytics/analytics.controller.ts`
- Update CSV export access in `apps/api/src/contacts/contacts.controller.ts`
- Update custom domain access in `apps/api/src/custom-domains/custom-domains.service.ts`
- Update webhook access in `apps/api/src/webhooks/webhooks.service.ts`
- Update team access in `apps/api/src/teams/teams.service.ts`
- If payment tiers change, update BoosterAI plan mapping in:
  - `apps/api/src/billing/billing.controller.ts`
  - `apps/api/src/billing/boosterai.client.ts`

## Frontend

- Update public pricing page in `apps/web/src/app/pricing/page.tsx`
- Update billing page prices and self-serve options in `apps/web/src/app/(dashboard)/settings/billing/page.tsx`
- Update nav gating if a feature changes plan in:
  - `apps/web/src/components/navigation/apps-nav.ts`
  - `apps/web/src/components/navigation/dashboard-nav.ts`
- Update page-level feature gates and upgrade cards where needed
- Update upgrade prompts for known gated actions

## Auth And Conversion Flow

- Verify pricing CTA links pass `plan` and `duration` into billing
- Verify `/auth` preserves `next`
- Verify auth callback redirects back to the intended billing state

## QA Checks

- Free user cannot exceed card limit
- Starter user cannot exceed card limit
- Pro user can create up to 3 cards
- Free and Starter cannot export CSV
- Pro can export CSV
- Free and Starter cannot use custom domains
- Pro can use custom domains
- Free and Starter cannot use webhooks
- Pro can use webhooks
- Team screens stay hidden or gated until Business rollout

## Build Checks

- Run `npm run build` in `apps/api`
- Run `npm run build` in `apps/web`

## Documentation

- Update `docs/PRICING_SPEC.md`
- Update `docs/PRICING_FEATURE_MATRIX.md`
- Update this checklist if enforcement locations change
