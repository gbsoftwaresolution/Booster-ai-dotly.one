CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lead_events" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leads_username_createdAt_idx" ON "leads"("username", "createdAt");
CREATE INDEX "lead_events_leadId_idx" ON "lead_events"("leadId");
CREATE INDEX "lead_events_action_idx" ON "lead_events"("action");
CREATE INDEX "lead_events_createdAt_idx" ON "lead_events"("createdAt");
CREATE INDEX "lead_events_leadId_createdAt_idx" ON "lead_events"("leadId", "createdAt");

ALTER TABLE "lead_events"
ADD CONSTRAINT "lead_events_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE IF EXISTS "click_events";
