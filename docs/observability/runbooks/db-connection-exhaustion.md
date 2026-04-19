# DB Connection Exhaustion

## Symptoms

- Elevated internal errors across unrelated routes
- Health endpoint returns degraded database state
- Sentry shows Prisma connection or timeout failures

## Check

- Metrics:
  - `dotly_api_error_events_total{code="internal_error"}`
  - `dotly_api_http_request_duration_seconds`
- Health endpoint: `/health`
- Database provider connection dashboard / pool usage

## Triage

1. Confirm whether failures are timeouts, connection exhaustion, or lock contention.
2. Check recent deploys and traffic spikes.
3. Correlate top failing routes by request logs.

## Mitigation

1. Reduce concurrent traffic if possible.
2. Restart stuck workers only after confirming root cause.
3. Scale DB or pool capacity if provider supports it.
4. Disable non-critical background jobs if they are amplifying pressure.

## Exit Criteria

- Health endpoint returns database `ok`
- 5xx/internal error rate returns to baseline
