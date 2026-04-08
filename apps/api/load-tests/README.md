# Dotly API Load Tests (k6)

## Prerequisites
Install k6: https://k6.io/docs/get-started/installation/

## Running tests

### Public card endpoint
```
k6 run apps/api/load-tests/public-card.js
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
