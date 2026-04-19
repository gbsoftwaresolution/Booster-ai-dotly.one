# Security Signoff

## Sprint 11 Status: Partial

- Secret scan blocks CI before lint/typecheck/build via TruffleHog in `.github/workflows/ci.yml`
- Tracked real `.env` files are blocked by `scripts/release-preflight.mjs`
- Git history secret scan is available via `pnpm security:scan-history`
- Current checked-in `secret-history-scan.txt` is empty after the latest scan
- Latest local verification on 2026-04-19: `pnpm security:scan-history` returned no matches

## Auth And Session Checklist

- [x] Access tokens expire after 15 minutes
- [x] Refresh tokens are opaque, server-stored as hashes, and rotated on refresh
- [x] Refresh-token sign-out invalidates the stored session
- [x] Password reset and email verification tokens are hashed at rest
- [x] Support/admin refund routes require both signed-in user allowlist and `x-dotly-support-ops-key`

Evidence:

- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/billing/dotly-support-ops.guard.ts`

## Upload And Outbound Request Checklist

- [x] Uploaded card media is validated by magic bytes, not only declared MIME type
- [x] Non-Dotly audio/video asset URLs are rejected
- [x] Outbound media-block URL fetches use SSRF-safe URL validation
- [x] Webhook endpoints reject private/reserved IP resolution and require HTTPS in production

Evidence:

- `apps/api/src/cards/cards.service.ts`
- `apps/api/src/webhooks/webhooks.service.ts`

## Billing And Webhook Trust Checklist

- [x] Sales-link Stripe webhook uses signature verification before processing
- [x] Billing Stripe webhook tests cover replay and retry behavior
- [x] Sales-link payment webhook tests cover replay and retry behavior
- [x] Webhook endpoint secrets are encrypted at rest and rotated on regeneration

Evidence:

- `apps/api/src/sales-link/sales-link.service.ts`
- `apps/api/src/sales-link/sales-link.service.spec.ts`
- `apps/api/src/billing/billing.service.spec.ts`
- `apps/api/src/webhooks/webhooks.service.ts`

## Operational Follow-up Still Required

- [ ] Confirm every production secret has been rotated in the provider dashboard
- [ ] Confirm all production/runtime secrets live only in Railway/Vercel/GitHub managed stores
- [ ] Re-run `pnpm security:scan-history` after any future secret incident response

Repo note:

- Secret rotation and provider-store confirmation are operational tasks and cannot be proven from source alone.
- Sprint 11 therefore remains `partial` until those provider-side checks are completed.
