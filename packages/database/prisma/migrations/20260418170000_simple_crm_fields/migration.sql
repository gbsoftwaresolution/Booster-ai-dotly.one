ALTER TABLE "leads"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'new',
ADD COLUMN "note" TEXT,
ADD COLUMN "followUpFlag" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "leads_username_status_idx" ON "leads"("username", "status");
