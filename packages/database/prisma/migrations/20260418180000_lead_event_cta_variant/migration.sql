ALTER TABLE "lead_events"
ADD COLUMN "ctaVariant" TEXT;

CREATE INDEX "lead_events_ctaVariant_idx" ON "lead_events"("ctaVariant");
