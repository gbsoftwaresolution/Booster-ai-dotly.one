# Observability Rollout Checklist

## 1. Environment

- Set `SENTRY_DSN` on API and web runtime
- Set `NEXT_PUBLIC_SENTRY_DSN` on web runtime
- Set `SENTRY_ORG` and `SENTRY_PROJECT` for source map upload in production builds
- Set `SENTRY_AUTH_TOKEN` in the production build environment for source map upload

## 2. Deploy

- Deploy API with Sprint 14 changes
- Deploy web with Sprint 14 changes

## 3. Metrics

- Scrape `GET /metrics` from Prometheus
- Import `docs/observability/dashboards/core-business-metrics.json` into Grafana
- Load `docs/observability/alerts/core-flow-alerts.yml` into Prometheus rules

## 4. Alert routing

- Route `severity=page` to primary on-call
- Route `severity=warn` to Slack/email
- Confirm grouping by `service`

## 5. Smoke tests

- Full smoke wrapper:
  - `pnpm observability:smoke`
- API metrics:
  - `pnpm --filter @dotly/api verify:metrics`
- Web Sentry:
  - `pnpm --filter @dotly/web verify:sentry`

## 6. Manual alert test

- Use Alertmanager/Grafana test notification for on-call channel
- Confirm page and warn routes arrive at the correct destinations

## 7. Manual incident drill

- Review runbooks in `docs/observability/runbooks/`
- Run one tabletop exercise for:
  - checkout broken
  - auth outage
  - webhook failures

## Exit criteria

- Metrics scrape green
- Dashboard imported
- Alert rules loaded
- One Sentry test event visible
- One alert notification received in the target channel
