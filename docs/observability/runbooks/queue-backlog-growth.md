# Queue / Backlog Growth

## Symptoms

- `DotlyQueueBacklogGrowth` alert firing
- Delayed background processing for enrichment or domain verification

## Check

- Metrics:
  - `dotly_api_queue_backlog_jobs`
- Identify queue/state combination growing:
  - `contact-enrichment`
  - `domain-verification`
- Check worker logs and Sentry for processor failures

## Triage

1. Determine whether backlog is `waiting`, `active`, `delayed`, or `failed`.
2. Check if Redis is degraded.
3. Check processor exceptions and external dependency latency.

## Mitigation

1. Drain or retry failed jobs only after the root cause is fixed.
2. Increase worker concurrency if safe.
3. Pause non-essential queued features if backlog threatens core product latency.

## Exit Criteria

- Waiting backlog returns below threshold
- Failed jobs are no longer accumulating
