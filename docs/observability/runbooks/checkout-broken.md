# Checkout Broken

## Symptoms

- Payment flow alert firing
- Upgrade checkout conversion drops sharply
- Sentry errors on checkout creation or activation routes

## Check

- Dashboard panels: Payment Outcomes, Upgrade Checkout Started vs Completed
- Metrics:
  - `dotly_api_sales_link_payments_total`
  - `dotly_api_upgrade_checkout_started_total`
  - `dotly_api_upgrade_checkout_completed_total`
- Logs for:
  - `sales_link_payment_created`
  - `upgrade_checkout_started`
  - `upgrade_checkout_completed`

## Triage

1. Confirm whether the failure is sales-link payment, upgrade checkout, or both.
2. Check Stripe mode and webhook secrets in production env.
3. Inspect Sentry for the first failing route and request IDs.
4. Verify `/billing/webhook` and `/payment/webhook` event flow.

## Mitigation

1. If Stripe webhook secret is wrong, rotate and redeploy.
2. If hosted crypto activation is failing, pause promotion of upgrade entry points and direct ops to manual review.
3. If only sales-link COD path is affected, verify pending payments can still be confirmed from dashboard.

## Exit Criteria

- Successful payment events resume
- Upgrade completion rate recovers above alert threshold
