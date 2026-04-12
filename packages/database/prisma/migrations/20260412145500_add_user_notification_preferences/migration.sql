-- Add missing user notification preference columns expected by schema and app code
ALTER TABLE "users"
  ADD COLUMN "notifLeadCaptured" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifWeeklyDigest" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifProductUpdates" BOOLEAN NOT NULL DEFAULT false;
