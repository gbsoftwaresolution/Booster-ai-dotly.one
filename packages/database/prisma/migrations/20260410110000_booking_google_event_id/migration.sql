-- Add googleEventId to Booking for Google Calendar event tracking
ALTER TABLE "bookings" ADD COLUMN "googleEventId" TEXT;
