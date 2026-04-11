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

## Completed Signoff

- Authenticated web runtime: PASS
- Mobile runtime: PASS
- Public web runtime: PASS
- Backend tests: PASS
- Typecheck: PASS
- New critical findings: NONE
- Final verdict: GREEN
