# Pricing Spec

## Status

Published plans now:

- Free
- Starter
- Pro

Hidden for later:

- Business
- Agency
- Enterprise

This document reflects the pricing model currently enforced in code across `apps/web` and `apps/api`.

## Billing Currency

- Currency: USDT
- Payment flow: BoosterAI PaymentVault

## Public Prices

### Free

- `0 USDT`

### Starter

- `10 USDT / month`
- `50 USDT / 6 months`
- `99 USDT / year`

### Pro

- `20 USDT / month`
- `99 USDT / 6 months`
- `199 USDT / year`

## Enforced Plan Limits

### Free

- Cards: `1`
- Analytics history: `7 days`
- CSV export: no
- Custom domains: no
- Webhooks: no
- Team members: `0`

### Starter

- Cards: `1`
- Analytics history: `30 days`
- CSV export: no
- Custom domains: no
- Webhooks: no
- Team members: `0`

### Pro

- Cards: `3`
- Analytics history: `90 days`
- CSV export: yes
- Custom domains: yes
- Webhooks: yes
- Team members: `0`

### Business

- Cards: `10`
- Analytics history: `365 days`
- CSV export: yes
- Custom domains: yes
- Webhooks: yes
- Team members: `10`

### Agency

- Cards: `50`
- Analytics history: `365 days`
- CSV export: yes
- Custom domains: yes
- Webhooks: yes
- Team members: `50`

### Enterprise

- Cards: unlimited
- Analytics history: unlimited
- CSV export: yes
- Custom domains: yes
- Webhooks: yes
- Team members: unlimited

## Current Product Rules

- Self-serve billing options are currently limited to `Starter` and `Pro`
- Public pricing page publishes only `Free`, `Starter`, and `Pro`
- Team features remain reserved for future `Business+` rollout

## Source Of Truth

Primary enforcement lives in:

- `apps/api/src/billing/billing.service.ts`
- `apps/api/src/cards/cards.service.ts`
- `apps/api/src/analytics/analytics.controller.ts`
- `apps/api/src/contacts/contacts.controller.ts`
- `apps/api/src/custom-domains/custom-domains.service.ts`
- `apps/api/src/webhooks/webhooks.service.ts`
- `apps/api/src/teams/teams.service.ts`

Pricing and billing UI lives in:

- `apps/web/src/app/pricing/page.tsx`
- `apps/web/src/app/(dashboard)/settings/billing/page.tsx`

## Notes

- If pricing copy changes, update both the public pricing page and billing page.
- If plan limits change, update backend enforcement first, then UI, then this document.
