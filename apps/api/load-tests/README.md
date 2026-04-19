# Dotly API Load Tests (k6)

## Prerequisites

Install k6: https://k6.io/docs/get-started/installation/

If `k6` is not installed locally, use Docker:

```bash
docker run --rm --add-host=host.docker.internal:host-gateway -e BASE_URL=http://host.docker.internal:3001 -v "$PWD/apps/api/load-tests:/scripts" grafana/k6 run /scripts/public-sales-link.js
```

## Running tests

### Public card endpoint

```
k6 run apps/api/load-tests/public-card.js
```

### Public sales-link endpoint

```
k6 run apps/api/load-tests/public-sales-link.js
```

```bash
docker run --rm --add-host=host.docker.internal:host-gateway -e BASE_URL=http://host.docker.internal:3001 -v "$PWD/apps/api/load-tests:/scripts" grafana/k6 run /scripts/public-sales-link.js
```

### Sales-link booking creation

```
k6 run apps/api/load-tests/sales-link-booking.js
```

```bash
docker run --rm --add-host=host.docker.internal:host-gateway -e BASE_URL=http://host.docker.internal:3001 -v "$PWD/apps/api/load-tests:/scripts" grafana/k6 run /scripts/sales-link-booking.js
```

### Payment webhook burst

```
k6 run apps/api/load-tests/payment-webhook-burst.js
```

```bash
docker run --rm --add-host=host.docker.internal:host-gateway -e BASE_URL=http://host.docker.internal:3001 -v "$PWD/apps/api/load-tests:/scripts" grafana/k6 run /scripts/payment-webhook-burst.js
```

### With custom base URL

```
k6 run -e BASE_URL=https://api.dotly.one apps/api/load-tests/public-card.js
```

### Analytics recording

```
k6 run apps/api/load-tests/analytics.js
```

### Spike test

```
k6 run apps/api/load-tests/health.js
```

## CI Integration

Load tests run automatically on the `load-test` branch or when triggered manually.
Pass threshold: p95 < 500ms, error rate < 1%

## Current Local Validation Notes

- `public-sales-link.js` passed locally on 2026-04-19 via Docker `grafana/k6`
- `sales-link-booking.js` passed locally on 2026-04-19 via Docker `grafana/k6`
- `payment-webhook-burst.js` passed locally on 2026-04-19 via Docker `grafana/k6`
- booking load treats `409 Conflict` as an expected application response when concurrent callers contend for the same slot
- webhook burst validation treats `200/201/400/404/429` as expected local responses so the test measures route responsiveness under real verification behavior
