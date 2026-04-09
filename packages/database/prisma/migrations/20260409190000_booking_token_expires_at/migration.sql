-- HIGH-4: Add tokenExpiresAt to bookings table.
-- The application sets this to startAt + 24h on every new booking so that
-- cancel/reschedule links expire after the appointment has passed.
-- Existing rows get NULL (treated as "no expiry" by the service layer).
ALTER TABLE "bookings"
  ADD COLUMN "tokenExpiresAt" TIMESTAMP(3);
