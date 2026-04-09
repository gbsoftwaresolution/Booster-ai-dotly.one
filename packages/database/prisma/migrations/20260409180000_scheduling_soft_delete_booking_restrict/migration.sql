-- CRITICAL-2: Two schema changes to prevent appointment type deletion from
-- destroying booking history.
--
-- 1. Add deletedAt soft-delete column to appointment_types.
--    Going forward the service sets this field instead of hard-deleting rows.
--    The column is nullable; NULL means the row is live.
--
-- 2. Change the Booking → AppointmentType FK from CASCADE to RESTRICT.
--    This makes the DB itself reject any hard-DELETE on appointment_types that
--    still has related booking rows, acting as a safety net in case application
--    code ever attempts a direct hard-delete.

-- 1. Add soft-delete column
ALTER TABLE "appointment_types"
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- 2. Drop the old CASCADE FK on bookings and replace with RESTRICT
ALTER TABLE "bookings"
  DROP CONSTRAINT IF EXISTS "bookings_appointmentTypeId_fkey";

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_appointmentTypeId_fkey"
    FOREIGN KEY ("appointmentTypeId")
    REFERENCES "appointment_types"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
