# Dotly.one Launch Checklist

## Pre-Launch (T-7 days)

- [ ] All 38 tasks implemented and building cleanly
- [ ] Staging environment deployed and smoke-tested
- [ ] Load test run against staging (p95 < 500ms)
- [ ] Security scan (npm audit, OWASP ZAP basic scan)
- [ ] Smart contract deployed to Polygon Mumbai testnet
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

## Monitoring Setup

- [ ] Sentry projects created (web + api), DSN added to env
- [ ] PostHog project created, key added to env
- [ ] Uptime monitor configured (UptimeRobot or Better Uptime for /health)
- [ ] PagerDuty or similar on-call rotation set up

## App Store

- [ ] iOS: App Privacy labels filled in
- [ ] Android: Privacy policy URL added to Play Console
- [ ] TestFlight internal testing done
- [ ] App Review screenshots prepared (6 per device type)

## Launch Day

- [ ] Deploy to production (main branch push triggers deploy.yml)
- [ ] Smoke tests pass
- [ ] Monitor Sentry for first 30 minutes
- [ ] Monitor PostHog for first user sign-ups
- [ ] Check email delivery (sign up with real email, verify welcome email)
- [ ] Test NFC write on physical device
- [ ] Test crypto billing on Polygon mainnet (or Mumbai testnet for launch)

## Post-Launch (T+7 days)

- [ ] Review Sentry error rate
- [ ] Review PostHog funnel: visit → sign-up → create card → share
- [ ] Address any P0/P1 bugs
- [ ] Schedule first load test against production
- [ ] Announce on Product Hunt / HN
