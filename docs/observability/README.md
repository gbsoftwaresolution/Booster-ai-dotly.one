# Observability

Sprint 14 hardens Dotly production readiness around one shared stack:

- API metrics: `GET /metrics`
- Error tracking: Sentry for API and web
- Structured logs: JSON logs with `requestId`, route, status, and safe user context
- Dashboards: `docs/observability/dashboards/core-business-metrics.json`
- Alerts: `docs/observability/alerts/core-flow-alerts.yml`
- Runbooks: `docs/observability/runbooks/*.md`

## Core signals

- `dotly_api_sales_link_views_total`
- `dotly_api_sales_link_leads_created_total`
- `dotly_api_sales_link_bookings_created_total`
- `dotly_api_sales_link_payments_total`
- `dotly_api_upgrade_checkout_started_total`
- `dotly_api_upgrade_checkout_completed_total`
- `dotly_api_webhook_events_total`
- `dotly_api_webhook_duration_seconds`
- `dotly_api_http_requests_total`
- `dotly_api_http_request_duration_seconds`
- `dotly_api_error_events_total`
- `dotly_api_queue_backlog_jobs`

## Environment

Set these in production:

- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

## Alert routing

The alert rules assume Alertmanager routing by severity and service labels.
Route `severity=page` to the primary on-call target and `severity=warn` to Slack/email.
