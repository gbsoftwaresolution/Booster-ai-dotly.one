# Disaster Recovery Runbook — Dotly.one

## RTO / RPO Targets
- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 1 hour (continuous WAL archiving target)

## Backup Strategy

### PostgreSQL
- Automated daily dumps via pg_dump (Railway managed or cron)
- Retention: 30 days
- Location: Cloudflare R2 bucket `dotly-backups`
- Restore test: Monthly drill

### Redis
- RDB snapshots every 1 hour (AOF disabled for performance)
- Redis Cloud managed backups (or manual rdb copy to R2)

### Cloudflare R2 (User uploads)
- R2 has built-in 99.999999999% durability
- Cross-region replication: Enable via R2 settings

## Backup Scripts

### PostgreSQL backup
```bash
pg_dump postgresql://naveenprasath-p@localhost/dotly_one?host=/var/run/postgresql | \
  gzip | \
  aws s3 cp - s3://dotly-backups/postgres/$(date +%Y-%m-%d-%H%M).sql.gz \
  --endpoint-url https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com
```

### Restore procedure
```bash
# 1. Download backup
aws s3 cp s3://dotly-backups/postgres/YYYY-MM-DD-HHMM.sql.gz . \
  --endpoint-url https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com
# 2. Restore
gunzip -c YYYY-MM-DD-HHMM.sql.gz | psql postgresql://naveenprasath-p@localhost/dotly_one
# 3. Verify
psql -c "SELECT COUNT(*) FROM users;" dotly_one
```

## Incident Response

### Severity Levels
- P0: Full outage, >100% users affected → Page on-call immediately
- P1: Partial outage, >10% users affected → Respond within 30 min
- P2: Degraded performance → Respond within 2 hours
- P3: Minor issue → Respond within 1 business day

### Decision Tree
1. Is the API returning 5xx? → Check Railway logs → Check DB connection
2. Is the web app down? → Check Vercel status → Check API health
3. Are emails not sending? → Check Mailgun dashboard → SES should auto-failover
4. Is card page slow? → Check Redis (analytics buffer) → Check ISR cache

## Chaos Engineering

### Drill Schedule
- Monthly: Kill and restore Redis (verify analytics fallback)
- Quarterly: Full DB restore from backup
- Semi-annual: Full region failover simulation
