# Dotly.one Production Runbook

## On-call Contacts

| Role              | Name | Contact |
| ----------------- | ---- | ------- |
| Primary On-call   | TBD  | TBD     |
| Secondary On-call | TBD  | TBD     |
| Engineering Lead  | TBD  | TBD     |
| Database Admin    | TBD  | TBD     |

---

## Service URLs

| Service               | URL                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Web (Production)      | https://dotly.one                                                                              |
| API Health            | https://api.dotly.one/health                                                                   |
| Swagger Docs          | Available at `/api/docs` outside production, or in production only when `SWAGGER_ENABLED=true` |
| Sentry (API errors)   | https://sentry.io/organizations/dotly                                                          |
| PostHog (Analytics)   | https://app.posthog.com                                                                        |
| Railway (API hosting) | https://railway.app/project/dotly-api                                                          |
| Railway (Web hosting) | https://railway.app                                                                            |
| Redis Cloud           | https://app.redislabs.com                                                                      |
| Mailgun               | https://app.mailgun.com                                                                        |

---

## Related Docs

- `PRICING_SPEC.md` — current enforced pricing and limits
- `PRICING_GATE_CHECKLIST.md` — required checks when pricing or feature gates change

---

## Common Incidents & Remediation

### API is down

**Symptoms:** `/health` returns non-200 or times out, users cannot log in.

**Steps:**

1. Check Railway logs: `railway logs --service api`
2. Confirm the health endpoint: `curl https://api.dotly.one/health`
3. Check DB connectivity from Railway console
4. If OOM / crash loop: restart service via Railway dashboard → "Restart"
5. Check if a bad deploy caused it — compare with the previous deploy hash
6. If DB is down: escalate to database on-call

---

### High error rate

**Symptoms:** Sentry error volume spikes > 10× baseline, user reports of 500 errors.

**Steps:**

1. Open Sentry dashboard, filter by `environment:production`, sort by volume
2. Identify the top error — check stack trace and affected release
3. If the error is from a recent deploy: initiate rollback (see Rollback Procedure below)
4. If it is a third-party failure (Google OAuth, Mailgun, Railway, Cloudflare): check their status pages
5. Silence noisy non-critical errors in Sentry while investigating

---

### DB connection pool exhausted

**Symptoms:** `P2024 Connection pool timeout` errors in Sentry, API returning 500s.

**Steps:**

1. Restart the API service to flush idle connections
2. Check the PostgreSQL connection pooler status on the current hosting provider
3. Identify slow queries using your database monitoring tooling
4. Add `LIMIT` / indexes or kill long-running queries:
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state = 'active' ORDER BY duration DESC;
   -- Kill if needed:
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE ...;
   ```
5. Consider increasing `connection_limit` in `schema.prisma` datasource

---

### Redis unavailable

**Symptoms:** Health endpoint shows `"redis": "error"`, Bull queues not processing.

**Steps:**

1. Check Redis Cloud dashboard for downtime or eviction
2. The API is designed to fall back to direct DB writes — queue jobs may be delayed
3. Verify fallback is active: check API logs for `Redis unavailable — fallback mode active`
4. Once Redis recovers, Bull will automatically reconnect (lazyConnect mode)
5. Re-queue failed work manually only after identifying the affected flow; no Bull board is currently documented in this repo

---

### Email delivery failing

**Symptoms:** Users not receiving welcome/notification emails, Mailgun error logs.

**Steps:**

1. Check Mailgun dashboard → Logs → filter by domain `mg.dotly.one`
2. If Mailgun is down: SES fallback should activate automatically when AWS SES credentials are configured
3. Verify SES sending limits have not been exceeded in AWS console
4. Verify delivery by triggering a real product flow that sends email (for example a staging booking confirmation or team invite)
5. Check SPF/DKIM DNS records if delivery rates drop suddenly

---

## Deployment

### Web (Railway)

Deployments are triggered automatically on push to `main`.

Preflight:

```bash
pnpm --filter @dotly/web run verify
```

```bash
# Manual deploy via Railway CLI
railway up --service dotly-web
```

Use the configured staging web URL for preview validation, or verify the active deployment in the Railway dashboard.

### API (Railway)

Deployments are triggered automatically on push to `main`; API deployment then runs as part of the production workflow.

Preflight:

```bash
pnpm --filter @dotly/api run verify
```

```bash
# Manual deploy via Railway CLI
railway up --service api
```

Monitor deploy progress in Railway dashboard → Deployments.

---

## Rollback Procedure

### Web (Railway)

1. Go to Railway dashboard → dotly-web service → Deployments
2. Find the last known-good deployment
3. Trigger a rollback or redeploy that version
4. Verify the health endpoint and smoke-test critical flows

### API (Railway)

1. Go to Railway dashboard → Service → Deployments
2. Find the last known-good deployment
3. Click "Rollback" on that deployment
4. Monitor logs to confirm the service restarted cleanly

### Database migrations

**Never auto-rollback a migration without DBA review.**

1. Identify the migration that introduced the issue
2. Write a compensating migration (e.g. drop a column added by mistake)
3. Test on staging first: `pnpm --filter @dotly/database exec prisma migrate dev --name revert_xxx`
4. Apply to production via Railway environment: `pnpm --filter @dotly/database exec prisma migrate deploy`

---

## Useful Commands

```bash
# Check API health
curl https://api.dotly.one/health | jq

# View recent Railway logs
railway logs --service api --tail 100

# Run DB migration on production (via Railway env)
pnpm --filter @dotly/database exec prisma migrate deploy

# Open Prisma Studio (local)
pnpm --filter @dotly/database exec prisma studio
```
