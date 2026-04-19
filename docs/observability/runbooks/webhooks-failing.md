# Webhooks Failing

## Symptoms

- `DotlyWebhookFailures` alert firing
- Missing payment success propagation
- Upgrade activations not completing after provider success

## Check

- Metrics:
  - `dotly_api_webhook_events_total`
  - `dotly_api_webhook_duration_seconds`
- Sentry issues tagged with webhook routes
- Logs containing webhook event type and request ID

## Triage

1. Identify source: `billing` or `sales_link_payment`.
2. Check signature secret validity and recent rotations.
3. Check provider-side delivery logs for retry storms or signature mismatches.
4. Confirm API health and latency are normal.

## Mitigation

1. Restore correct webhook secrets.
2. Replay missed provider events where safe.
3. If provider outage is upstream, disable alert noise after documenting the incident and switch to manual reconciliation.

## Exit Criteria

- Webhook failure metric returns to zero
- Delayed successful provider events are reconciled
