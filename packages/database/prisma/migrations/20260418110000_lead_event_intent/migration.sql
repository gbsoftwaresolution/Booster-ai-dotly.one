ALTER TABLE "lead_events"
ADD COLUMN "intent" TEXT;

CREATE INDEX "lead_events_intent_idx" ON "lead_events"("intent");
