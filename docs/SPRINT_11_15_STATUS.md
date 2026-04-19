# Sprint 11-15 Status

This document tracks the user-directed launch-readiness wedge for Sprints 11-15.

Scope:

- public sales link
- lead capture
- WhatsApp CTA tracking
- booking
- payment
- upgrade
- security gates
- dependency/platform stability
- observability for the money path
- launch-path performance and simplification

## Current Status

- Sprint 11: `partial`
- Sprint 12: `pass`
- Sprint 13: `pass`
- Sprint 14: `partial`
- Sprint 15: `pass`

## Evidence Summary

### Sprint 11

- CI blocks on secret scanning before lint/typecheck/build via TruffleHog
- tracked real `.env` files are blocked by `scripts/release-preflight.mjs`
- `pnpm security:scan-history` returned no matches in the latest local run on 2026-04-19
- auth/session hardening, admin-route protection, upload validation, SSRF checks, and webhook trust boundaries are implemented in repo

Remaining blocker:

- production secret rotation and provider-managed secret-store confirmation are operational tasks and still need explicit signoff

Primary references:

- `docs/SECURITY_SIGNOFF.md`
- `.github/workflows/ci.yml`
- `scripts/release-preflight.mjs`
- `scripts/scan-git-history-secrets.mjs`

### Sprint 12

- `next` and `eslint-config-next` are aligned at `15.5.15`
- dependency baseline and verification evidence are captured in `docs/PRODUCTION_SIGNOFF_CHECKLIST.md`
- root overrides pin risky transitive dependencies for launch stability

Primary references:

- `docs/PRODUCTION_SIGNOFF_CHECKLIST.md`
- `package.json`

### Sprint 13

- `pnpm --filter @dotly/web test:e2e:core-flow` passed locally on 2026-04-19 (`6 passed`)
- core money path is covered locally for public link, lead capture, WhatsApp CTA tracking, booking, payment, and upgrade
- replay/retry behavior is covered in API webhook tests
- current payment evidence is still tied to the existing hosted-payment/webhook flow in repo, not a crypto-only on-chain confirmation path

Primary references:

- `apps/web/e2e/core-money-path.spec.ts`
- `apps/api/src/sales-link/sales-link.service.spec.ts`
- `apps/api/src/billing/billing.service.spec.ts`

### Sprint 14

- structured logs with `requestId` are wired in API
- metrics endpoint and business counters are implemented
- alerts and runbooks exist for core incidents
- `pnpm --filter @dotly/api verify:metrics` passed locally on 2026-04-19

Remaining blocker:

- runtime Sentry provider proof is still missing because `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` are not configured in the local validation environment

Primary references:

- `docs/observability/README.md`
- `docs/observability/ROLLOUT_CHECKLIST.md`
- `docs/observability/PRODUCTION_PROVIDER_CHECKLIST.md`

### Sprint 15

- public sales link runtime is serving from the live local API
- launch dashboard and launch-path simplification changes are in repo
- launch-path load tests passed locally on 2026-04-19 via Docker `grafana/k6`

Results:

- `public-sales-link.js`: `http_req_failed=0.00%`, `p95=24.8ms`
- `sales-link-booking.js`: `http_req_failed=0.00%`, `p95=16.44ms`
- `payment-webhook-burst.js`: `http_req_failed=0.00%`, `p95=5.33ms`

Important nuance:

- webhook burst validation measures route availability under real local verification responses (`200/201/400/404/429`), not successful live Stripe signature verification

## Crypto-Only Payment Reality Check

- The current sales-link payment implementation is still Stripe-first in code:
  - `apps/api/src/sales-link/sales-link.service.ts` creates Stripe Checkout sessions for the active Stripe provider
  - `apps/api/src/sales-link/sales-link.controller.ts` exposes `POST /payment/webhook` for Stripe payment events
  - `packages/database/prisma/schema.prisma` stores `stripeId` on `Payment` and does not yet model network and tx-hash verification for this flow
- Because of that, this repo should not be described as crypto-payment production ready today for the sales-link launch path.
- A crypto-only launch requires, at minimum:
  - on-chain transaction verification
  - network/token/amount/recipient validation
  - confirmation depth enforcement
  - idempotent `txHash` handling
  - explicit wrong-payment policy and UX warnings

Primary references:

- `docs/LAUNCH_CHECKLIST.md`
- `apps/api/load-tests/README.md`
- `apps/api/load-tests/public-sales-link.js`
- `apps/api/load-tests/sales-link-booking.js`
- `apps/api/load-tests/payment-webhook-burst.js`

## Remaining Work Before Calling Everything Fully Green

1. Confirm provider-side production secret rotation and managed secret storage.
2. Configure `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in deployed environments.
3. Run `pnpm observability:smoke` against deployed environments.
4. Run the three launch-path load tests against staging or production-like infra.
5. Verify one full production owner funnel after deploy.
6. If launch payments are crypto-only, replace Stripe-dependent sales-link payment confirmation with verified on-chain confirmation before launch.

## Recommended Signoff Language

- Launch wedge verdict: ready with two operational follow-ups
- Operational follow-ups: Sprint 11 secret rotation confirmation, Sprint 14 Sentry rollout proof
