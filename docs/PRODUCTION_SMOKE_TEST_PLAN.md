# Production Smoke Test Plan

Use this before launch, after deployment, and after any change touching auth, billing, pricing, cards, CRM, scheduling, or public sharing.

## Scope

Critical user journeys:

- marketing and pricing
- auth and callback redirects
- pricing to billing handoff
- paid feature gates
- public card rendering and lead capture
- card management limits
- scheduling integrations

## Environments

- Web: production deployment URL
- API: production API URL
- Test accounts:
  - Free user
  - Starter user
  - Pro user
  - Business test user if team features are being validated internally

## Preflight

Run before manual smoke checks:

```bash
pnpm --filter @dotly/api run verify
pnpm --filter @dotly/web run verify
```

Confirm envs are set:

- web:
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_WEB_URL`
  - `NEXT_PUBLIC_SITE_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- web server-side:
  - `API_URL` or `INTERNAL_API_URL`
- api:
  - `WEB_URL`
  - `SUPABASE_JWT_SECRET`
  - `REDIS_URL`
  - `R2_SECRET_ACCESS_KEY`
  - payment and email envs

## Smoke Tests

### 1. Public marketing surfaces

- Open `/`
- Open `/pricing`
- Confirm only `Free`, `Starter`, and `Pro` are visible
- Confirm `Business`, `Agency`, and `Enterprise` are not publicly sold
- Confirm Starter shows `10 / 50 / 99`
- Confirm Pro shows `20 / 99 / 199`

Pass condition:

- page loads cleanly on desktop and mobile width
- pricing copy matches current public plans

### 2. Auth and callback flow

- Open `/auth`
- Verify sign-in UI loads
- Verify Google button is present
- Verify email/password form renders
- Complete sign-in with a test account
- Confirm redirect lands on intended `next` destination if arriving from a protected route

Pass condition:

- no callback failure page
- no redirect loop
- authenticated user lands in the expected app surface

### 3. Pricing to billing handoff

- From `/pricing`, click Starter CTA
- Confirm auth flow preserves selection
- Land in `/settings/billing` with Starter preselected
- Repeat for Pro
- Repeat for Monthly, 6 Months, and Annual durations

Pass condition:

- selected plan and duration survive auth and appear correctly in billing

### 4. Free plan gating

Using a Free user:

- Open cards create flow and create first card if needed
- Attempt to create or duplicate another card
- Confirm upgrade prompt appears
- Open `/settings/domains`
- Confirm gated upgrade card appears
- Open `/settings/webhooks`
- Confirm gated upgrade card appears
- Try exporting contacts/leads CSV
- Confirm upgrade message appears
- Open `/team`
- Confirm future-plan gate appears

Pass condition:

- Free user cannot access Pro features
- messaging is clear and points to billing where appropriate

### 5. Starter plan gating

Using a Starter user:

- Confirm only 1 card allowed
- Confirm domains are gated
- Confirm webhooks are gated
- Confirm CSV export is gated
- Confirm team remains gated

Pass condition:

- Starter behaves like current policy, not like Pro

### 6. Pro capabilities

Using a Pro user:

- Create up to 3 cards
- Duplicate a card successfully within limit
- Open `/settings/domains` and add a domain record
- Open `/settings/webhooks` and create a webhook endpoint
- Export contacts CSV
- Export leads CSV

Pass condition:

- all Pro-only capabilities work without gate errors

### 7. Billing flow

Using a test wallet flow:

- Open billing page
- Verify wallet connect works
- Verify no-wallet payment UI renders
- Start a Starter purchase
- Start a Pro purchase
- Verify order creation succeeds
- Verify activation polling returns expected status

Pass condition:

- no broken payment UI
- plan selection matches order creation payload

### 8. Public card journey

- Open a known public card
- Verify page renders correctly
- Verify social links work
- Verify save-to-contacts works
- Verify analytics beacon fires without visible errors
- If lead capture is enabled, submit a lead

Pass condition:

- public share flow works end-to-end

### 9. Scheduling

- Open scheduling pages as signed-in user
- Verify appointment types load
- Verify bookings load
- Start Google connect flow
- Complete callback with test account if available
- Confirm redirect returns to scheduling with success state

Pass condition:

- no localhost redirects
- no callback failure

### 10. Operational checks

- Check web Sentry for new production errors after deploy
- Check API logs for startup/config errors
- Check billing/order logs for payment failures
- Check email delivery logs for auth or lead notifications

Pass condition:

- no spike in new errors after release

## Current Automated Coverage Gap

Existing Playwright coverage is minimal and mostly page-load or redirect checks.

New automated coverage now exists for:

- pricing to auth handoff with selected plan and duration
- auth redirect preservation for protected routes
- auth callback rejection of invalid codes and invalid external redirects
- optional authenticated plan-gate checks when per-plan storage states are provided

Optional authenticated Playwright envs:

- `PLAYWRIGHT_FREE_STATE`
- `PLAYWRIGHT_STARTER_STATE`
- `PLAYWRIGHT_PRO_STATE`

Auth-state generation helper:

```bash
pnpm --filter @dotly/web run test:e2e:auth-states
pnpm --filter @dotly/web run test:e2e:gates
```

Required envs for auth-state generation:

- `PLAYWRIGHT_FREE_EMAIL`
- `PLAYWRIGHT_FREE_PASSWORD`
- `PLAYWRIGHT_STARTER_EMAIL`
- `PLAYWRIGHT_STARTER_PASSWORD`
- `PLAYWRIGHT_PRO_EMAIL`
- `PLAYWRIGHT_PRO_PASSWORD`

Not meaningfully covered today:

- pricing to billing selection handoff
- live sign-in callback behavior
- billing purchase flow
- custom domains flow
- webhooks flow
- team gating behavior
- CSV export plan enforcement in real UI flows
- Google scheduling connect callback

## Recommended Release Rule

Do not mark a release production-ready unless:

- both app builds pass
- this smoke test plan is completed for the critical flows above
- auth callback, pricing to billing, and at least one Pro-only feature are manually verified
