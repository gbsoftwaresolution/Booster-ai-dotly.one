# Dotly.one Launch Checklist

## Pre-Launch (T-7 days)

- [x] Core launch path only: sales link, leads, bookings, payments, upgrade, auth
- [ ] Staging environment deployed and smoke-tested
- [ ] Load tests run against staging:
- [ ] `k6 run apps/api/load-tests/public-sales-link.js`
- [ ] `k6 run apps/api/load-tests/sales-link-booking.js`
- [ ] `k6 run apps/api/load-tests/payment-webhook-burst.js`
- [ ] Security scan (npm audit, OWASP ZAP basic scan)
- [ ] First-party auth configured (Google OAuth client + redirect URLs set)
- [ ] Mailgun domain verified (dotly.one)
- [ ] Cloudflare R2 bucket created and CORS configured
- [ ] All environment variables set in Vercel + Railway production
- [ ] Pricing pages, billing flow, and feature gates reviewed against `PRICING_SPEC.md`
- [ ] Upgrade prompts tested for gated features using `PRICING_GATE_CHECKLIST.md`

## DNS Setup

- [ ] dotly.one → Vercel (A/CNAME)
- [ ] api.dotly.one → Railway (CNAME)
- [ ] www.dotly.one → dotly.one (redirect)
- [ ] Cloudflare proxied (orange cloud) for DDoS protection

## Security Pre-Launch

- [ ] SSL certificates valid
- [ ] Security headers verified (securityheaders.com)
- [ ] Rate limiting tested (429 response on excess requests)
- [ ] `NEXT_PUBLIC_` vars don't expose secrets
- [ ] `.env` not committed to git
- [ ] `pnpm security:scan-history` reviewed with no proven live-secret hits
- [ ] All rotated production secrets stored only in platform secret managers

## Monitoring Setup

- [ ] Sentry projects created (web + api), DSN added to env
- [ ] Uptime monitor configured (UptimeRobot or Better Uptime for /health)
- [ ] PagerDuty or similar on-call rotation set up

## Payments (Crypto)

- [ ] Launch payment path is crypto-only by deliberate choice; Stripe Checkout and Stripe webhooks are not part of the production flow
- [ ] Unique payment reference is created per payment request
- [ ] Wallet address generation or assignment is working for the selected network
- [ ] Blockchain verification service is live for the production chain
- [ ] Verification enforces correct recipient wallet address
- [ ] Verification enforces exact supported token
- [ ] Verification enforces exact supported network
- [ ] Verification enforces exact expected amount
- [ ] Minimum confirmation depth is enforced before payment becomes `confirmed`
- [ ] Duplicate `txHash` is rejected or ignored idempotently
- [ ] Dashboard revenue reflects confirmed on-chain payments only
- [ ] Wrong-chain, wrong-token, and wrong-amount behavior is explicitly defined for ops and support
- [ ] Payment screen warns users to send the exact amount on the exact supported network
- [ ] Safe-mode scope is enforced for V1: one token and one chain only
- [ ] Team can answer yes to: `If a user sends crypto, can we 100% detect and confirm it?`

### Crypto Launch Blocker

- The current repo is not yet crypto-payment ready for the sales-link flow if it still depends on hosted Stripe checkout or Stripe webhook confirmation anywhere in the production path.
- Do not launch crypto payments until on-chain verification replaces user-asserted payment success and replaces Stripe webhook dependence for that path.

## App Store

- [ ] iOS: App Privacy labels filled in
- [ ] Android: Privacy policy URL added to Play Console
- [ ] TestFlight internal testing done
- [ ] App Review screenshots prepared (6 per device type)

## Launch Day

- [ ] Deploy to production (main branch push triggers deploy.yml)
- [x] Smoke tests pass
- [ ] Monitor Sentry for first 30 minutes
- [ ] Check email delivery (sign up with real email, verify welcome email)
- [ ] Verify sales link -> booking -> payment owner funnel once in prod

## Sprint 15 Validation Notes

- Verified locally on 2026-04-19: `pnpm --filter @dotly/api build`
- Verified locally on 2026-04-19: `GET /public-page/:username` responds from the live API runtime
- Verified locally on 2026-04-19: `GET /health` returned database and redis `ok`
- Verified locally on 2026-04-19: `pnpm --filter @dotly/web test:e2e:core-flow` passed (`6 passed`)
- Added launch-path load-test scenarios: `apps/api/load-tests/public-sales-link.js`, `apps/api/load-tests/sales-link-booking.js`, `apps/api/load-tests/payment-webhook-burst.js`
- Verified locally on 2026-04-19 via Docker `grafana/k6` image: `public-sales-link.js` passed with `http_req_failed=0.00%`, `p95=24.8ms`
- Verified locally on 2026-04-19 via Docker `grafana/k6` image: `sales-link-booking.js` passed with `http_req_failed=0.00%`, `p95=16.44ms`
- Verified locally on 2026-04-19 via Docker `grafana/k6` image: `payment-webhook-burst.js` passed with `http_req_failed=0.00%`, `p95=5.33ms`
- Local caveat: webhook burst validation measures route availability under real verification responses (`200/201/400/404/429`), not successful Stripe signature verification in a live provider environment

## Sprint 11-15 Launch Status

- Sprint 11: `partial` - repo-side controls are in place, but provider-side secret rotation and secret-manager rollout still need operational confirmation
- Sprint 12: `pass` - dependency/platform baseline aligned and verified
- Sprint 13: `pass` - core money-path E2E is green, including WhatsApp CTA visibility in owner funnel evidence
- Sprint 14: `partial` - logs/metrics/alerts/runbooks/Sentry wiring exist, but runtime Sentry provider evidence is still pending env rollout
- Sprint 15: `pass` - launch-path performance, simplification, and local load validation are green

## Payment Architecture Reality Check

- The current sales-link payment flow in the repo still contains Stripe Checkout and Stripe webhook handling.
- If launch requirements change to crypto-only payments, the current payment path should be treated as `not production ready` until on-chain verification, confirmation depth checks, tx hash idempotency, and wrong-payment handling are implemented and tested.

## Post-Launch (T+7 days)

- [ ] Review Sentry error rate
- [ ] Address any P0/P1 bugs
- [ ] Schedule first load test against production
- [ ] Review whether hidden launch surfaces can be re-enabled safely
