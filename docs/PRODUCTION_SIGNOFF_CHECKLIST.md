# Production Signoff Checklist

This document is the release gate for taking the current repo state to production.

## Blocker 1: Authenticated Web Runtime

### Pass Criteria

- `dashboard -> card edit` opens `/apps/cards/:id/edit` for a real authenticated user
- Edited card fields persist after save and reload
- `team sign-in` for a valid team user lands on `/team`, not back on sign-in
- Protected routes redirect unauthenticated users to `/auth?next=...`
- Authenticated users are not bounced incorrectly by middleware/layout guards

### Evidence Required

- Playwright run output or recorded manual QA with timestamps
- Screenshots or video for:
  - dashboard page
  - card editor page
  - successful team sign-in landing page

### Suggested Commands

```bash
pnpm --filter @dotly/web test:e2e -- e2e/dashboard-card-links.spec.ts
```

### Recommended Additional Spec Targets

- authenticated card save and reload
- team sign-in success with seeded fixture account

### Fail Conditions

- redirect loops
- wrong destination after auth
- stale legacy `/cards/*` rewrites
- editor opens but loads the wrong card or fails to save

## Blocker 2: Mobile Runtime Verification

### Pass Criteria

- notification tap with `contactId` opens `/contact/:id`
- contact create works with valid input
- invalid email, phone, or website is blocked in UI
- contact stage update surfaces success or failure correctly
- card detail shows actual avatar when present
- avatar upload failure shows retry-oriented error, not false success
- card link and share surface is understandable and not misleading

### Evidence Required

- emulator or device recording
- screenshots for each flow
- API logs if needed to confirm write success

### Minimum Manual QA Script

1. Sign in on mobile.
2. Open a card with avatar and verify display.
3. Edit card avatar, force an upload failure, verify error copy.
4. Create a contact with valid data.
5. Attempt invalid email, phone, and website values and confirm client validation.
6. Change contact stage and confirm visible result.
7. Send or tap a notification with `contactId` and confirm deep-link target.

### Fail Conditions

- silent mutation failures
- notification lands on wrong screen
- invalid input accepted then rejected later by API
- misleading success or failure copy
- placeholder or fake UI presented as working

## High-Confidence Non-Blocker Validation

These should still be rechecked before release, but they are not the current gate.

- public scheduling booking
- public scheduling reschedule
- lead capture persistence
- inbox upload confirmation
- billing wallet normalization
- team invite duplicate handling
- Apple Wallet fail-closed behavior

### Pass Criteria

- existing Jest and Playwright suites remain green
- no regression in public flows after final changes

### Commands

```bash
pnpm --filter @dotly/api test
pnpm --filter @dotly/api typecheck
pnpm --filter @dotly/web typecheck
pnpm exec playwright test e2e/auth.spec.ts e2e/pricing.spec.ts e2e/scheduling-public.spec.ts
```

## Release Gate

### GREEN only if all are true

- authenticated web runtime flows pass
- mobile runtime verification is completed and evidenced
- existing API and browser suites stay green
- no new critical or high findings are opened during signoff

### NOT GREEN if any are true

- authenticated web flows are still unproven
- mobile runtime is still unverified
- any critical path fails or is flaky
- release depends on "should work" instead of recorded evidence

## Signoff Template

- Authenticated web runtime: PASS / FAIL
- Mobile runtime: PASS / FAIL
- Public web runtime: PASS / FAIL
- Backend tests: PASS / FAIL
- Typecheck: PASS / FAIL
- New critical findings: NONE / LIST
- Final verdict: GREEN / NOT GREEN

## Engineering Hardening Status

These items were confirmed during the repo audit and hardening pass through code tracing, implementation, and type/test verification. They reduce known launch risk, but they do not replace recorded end-to-end signoff evidence.

### Confirmed Hardened

- web authenticated routing and auth-boundary redirects
- web team sign-in team-slug validation and existing-session handling
- web contacts list/detail mutation refresh behavior
- web contacts delete confirmations and error surfacing
- web contacts and leads bulk-selection consistency across reload/filter changes
- web leads bulk delete partial-failure handling
- web team create/invite/role-change duplicate-submit protection
- web settings notification preference cache ordering
- web card-builder immediate-save rollback and stale late-response protection
- web deals and tasks contact-picker stale-response protection
- web contact drawer stale detail-load protection when switching contacts quickly
- web contact drawer task/deal cross-action in-flight protection
- web contact drawer enrichment polling stale-update protection
- web contact drawer duplicate-lookup stale-response protection
- web contact drawer custom-field same-field save protection
- mobile contacts search/pagination stale-response protection
- mobile deals/tasks row-level in-flight mutation protection
- mobile contact-detail task/deal row-level in-flight mutation protection
- mobile card create/edit validation hardening
- api `/users/me` PATCH response alignment with GET response contract

### Verified By Command

- `pnpm -C apps/web exec tsc --noEmit`
- `pnpm -C apps/mobile exec tsc --noEmit`
- `pnpm -C apps/api exec tsc --noEmit`
- `pnpm -C apps/api exec jest src/teams/teams.service.spec.ts src/users/users.service.spec.ts src/wallet-passes/wallet-passes.service.spec.ts`

### Sprint 12 Dependency Baseline

- workspace package manager: `pnpm@10.32.1`
- root toolchain: `typescript@5.9.3`, `turbo@2.9.4`, `prettier@3.8.1`
- web framework baseline: `next@15.5.15`, `eslint-config-next@15.5.15`, `react@19.2.4`, `react-dom@19.2.4`
- api framework baseline: `@nestjs/common@10.4.22`, `@nestjs/core@10.4.22`, `@nestjs/platform-express@10.4.22`, `@nestjs/swagger@7.4.2`
- mobile baseline: `expo@51.0.39`, `react-native@0.74.0`, `react@18.2.0`
- removed duplicate type packages: `@types/dompurify`, `@types/bull`
- pinned transitive security overrides at root for launch-path stabilization:
  - `protobufjs >= 7.5.5`
  - `dompurify >= 3.4.0`
  - `file-type >= 21.3.2`
  - `follow-redirects >= 1.16.0`

### Sprint 12 Verification Evidence

- `pnpm audit --prod`
  - critical launch-path advisory removed
  - remaining advisories reduced to 2 moderate and 3 low
- `pnpm --filter @dotly/web lint` PASS
- `pnpm --filter @dotly/web build` PASS
- `pnpm --filter @dotly/web typecheck` hit a pre-existing flaky `.next` cleanup issue and the script was hardened to use Node `rmSync` retries
- `pnpm --filter @dotly/api typecheck` PASS
- `pnpm --filter @dotly/api build` PASS
- `pnpm --filter @dotly/mobile typecheck` PASS
- `pnpm --filter @dotly/api lint` FAIL on pre-existing repo lint issues unrelated to dependency changes
- `pnpm --filter @dotly/mobile lint` FAIL on pre-existing repo lint issues unrelated to dependency changes

### Deferred Dependency Risk

- `@nestjs/core` advisory remains because clearing it cleanly requires a broader Nest major upgrade path than this stabilization sprint took on
- `@nestjs/swagger -> js-yaml` moderate advisory remains for the same reason
- Expo CLI low advisory remains in the mobile toolchain and is outside the web/API launch path
- Sentry webpack-plugin low advisories remain until the Sentry/webpack chain is upgraded beyond the current compatible baseline
- `nestjs-throttler-storage-redis` remains deprecated; replacement was not swapped in this sprint because a safe maintained registry replacement was not verified in this environment

### Nest 10 To 11 Upgrade Plan

1. Upgrade the Nest core package family together in one branch:
   - `@nestjs/common`
   - `@nestjs/core`
   - `@nestjs/platform-express`
   - `@nestjs/testing`
   - `@nestjs/config`
   - `@nestjs/jwt`
   - `@nestjs/passport`
   - `@nestjs/schedule`
   - `@nestjs/swagger`
2. Re-audit `app.module.ts`, auth guards, Swagger bootstrap, and scheduler wiring for Nest 11 API changes.
3. Re-check rate limiting storage compatibility before touching the deprecated Redis throttler package.
4. Run `pnpm audit --prod`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and API tests after the framework bump.
5. Only remove the current residual Nest advisories after the upgraded branch is green end-to-end.

### Current Workspace Gate Status

- `pnpm lint` passes with warnings only; no remaining lint errors are blocking the workspace gate
- `pnpm typecheck` passes across the workspace
- isolated `pnpm --filter @dotly/web build` passes reliably
- `pnpm build` passed again in repeated reruns after the earlier intermittent Next.js `/404` export race; current baseline should be treated as stable, with that earlier failure noted only for monitoring

### User-Directed Sprint 11-15 Launch Wedge Status

This status tracks the narrower launch-readiness wedge requested during the current signoff pass: public sales link, lead capture, bookings, payments, upgrades, security gates, dependency stability, and observability for that path. It does not replace the broader authenticated-web/mobile release gate above.

- Sprint 11: `partial`
  - repo-side secret scanning, tracked-env blocking, auth/session hardening, upload validation, SSRF protections, and webhook trust boundaries are in place
  - `pnpm security:scan-history` produced no current git-history matches in the latest run
  - production secret rotation and provider-managed secret-store confirmation remain operational signoff tasks
- Sprint 12: `pass`
  - `next` and `eslint-config-next` are aligned at `15.5.15`
  - dependency baseline and verification evidence are captured in this document
- Sprint 13: `pass`
  - `pnpm --filter @dotly/web test:e2e:core-flow` passed locally on 2026-04-19 (`6 passed`)
  - core flow covers public link, lead capture, WhatsApp CTA tracking, booking, payment, upgrade, replay, retry, and negative-path behavior for the launch wedge
- Sprint 14: `partial`
  - structured logs with request IDs, `/metrics`, business metrics, alerts, and runbooks are in repo
  - `pnpm --filter @dotly/api verify:metrics` passed locally on 2026-04-19
  - web/API Sentry provider rollout still needs env-backed runtime proof (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`)
- Sprint 15: `pass`
  - local API runtime serves `/public-page/:username` and `/health` successfully
  - Docker `grafana/k6` runs passed on 2026-04-19 for:
    - `apps/api/load-tests/public-sales-link.js`
    - `apps/api/load-tests/sales-link-booking.js`
    - `apps/api/load-tests/payment-webhook-burst.js`
  - all three local load runs completed with `http_req_failed=0.00%`

### Still Unverified For Final Signoff

- recorded web runtime evidence for the critical authenticated flows listed above
- recorded mobile runtime evidence for the critical device flows listed above
- final manual or automated evidence for public runtime flows after the latest hardening patches
- slow-network runtime behavior for some remaining non-audited CRUD surfaces

### Residual Risks

- some untouched CRUD areas outside CRM/team/settings/card-builder have not yet had the same strict runtime audit
- some flows still prefer local optimistic state over canonical refetch after every mutation
- release should remain `NOT GREEN` until required runtime evidence is captured

## Completed Signoff

- Authenticated web runtime: FAIL
- Mobile runtime: FAIL
- Public web runtime: FAIL
- Backend tests: PASS
- Typecheck: PASS
- New critical findings: NONE currently open from the completed audit pass
- Final verdict: NOT GREEN
