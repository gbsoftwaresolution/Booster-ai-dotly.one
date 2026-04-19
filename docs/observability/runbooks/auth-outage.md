# Auth Outage

## Symptoms

- `DotlyAuthSpike` alert firing
- `/auth`, `/api/auth/sign-in`, or `/api/auth/refresh` errors rising
- Users loop back to sign-in or refresh fails continuously

## Check

- Metrics:
  - `dotly_api_error_events_total{route=~"/auth.*"}`
  - `dotly_api_http_requests_total{route=~"/auth.*"}`
- Sentry issues for auth callback, refresh, or JWT validation
- Logs:
  - `auth_sign_in_succeeded`
  - `auth_refresh_succeeded`
  - request-completed logs for auth endpoints

## Triage

1. Determine if outage is sign-in, refresh, or Google callback only.
2. Verify `AUTH_JWT_SECRET`, Google OAuth secrets, and `WEB_URL` are unchanged.
3. Check DB access to `authSession` records.
4. Check whether refresh failures are 401, 403, or 500.

## Mitigation

1. If JWT secret drifted, restore the active production secret immediately.
2. If callback config drifted, restore provider redirect URI and client secret.
3. If DB or Redis is degraded, mitigate dependency issue first.

## Exit Criteria

- Auth error rates normalize
- New sign-ins and session refreshes succeed end-to-end
