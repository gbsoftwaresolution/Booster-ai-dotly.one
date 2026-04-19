# Production Provider Checklist

## Railway

### API service

- Set:
  - `SENTRY_DSN`
  - `DATABASE_URL`
  - `REDIS_URL`
  - `WEB_URL`
  - billing/webhook secrets already required by production
- Confirm public networking allows Prometheus scraping of `/metrics`

### Web service

- Set:
  - `SENTRY_DSN`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_WEB_URL`
  - `API_URL`

## Sentry

- Create or confirm one project for API and one for web, or a shared project if that is your current model
- Set build env:
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SENTRY_AUTH_TOKEN`
- After deploy, run the web smoke route and confirm one test event lands with tags:
  - `source=observability_smoke_test`
  - `surface=web`

## Prometheus

- Add scrape target for API `/metrics`
- Confirm these metrics appear:
  - `dotly_api_http_requests_total`
  - `dotly_api_sales_link_leads_created_total`
  - `dotly_api_sales_link_payments_total`
  - `dotly_api_upgrade_checkout_started_total`
  - `dotly_api_webhook_events_total`

## Grafana

- Import `docs/observability/dashboards/core-business-metrics.json`
- Wire datasource to Prometheus
- Save dashboard in production folder with on-call access

## Alertmanager

- Load `docs/observability/alerts/core-flow-alerts.yml`
- Route labels:
  - `severity=page` -> pager/on-call
  - `severity=warn` -> Slack/email
- Test both routing paths with a built-in test notification

## Sign-off

- `pnpm observability:smoke` passes against deployed envs
- One Sentry test event visible
- One alert test notification delivered
- Dashboard loads with real series
