-- Add timezone to appointment_types
ALTER TABLE "appointment_types" ADD COLUMN "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC';

-- Add reminderSentAt to bookings
ALTER TABLE "bookings" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- Index for reminder cron query: confirmed bookings without a reminder sent
CREATE INDEX "bookings_status_startAt_reminderSentAt_idx" ON "bookings"("status", "startAt", "reminderSentAt");
