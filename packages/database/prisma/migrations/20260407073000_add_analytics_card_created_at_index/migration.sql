-- Improves card analytics range queries
CREATE INDEX IF NOT EXISTS "analytics_events_cardId_createdAt_idx"
ON "analytics_events" ("cardId", "createdAt");
