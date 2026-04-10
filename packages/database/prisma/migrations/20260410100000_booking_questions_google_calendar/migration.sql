-- CreateEnum (idempotent via DO block)
DO $$ BEGIN
  CREATE TYPE "BookingQuestionType" AS ENUM ('TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'SELECT', 'CHECKBOX');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: BookingQuestion
CREATE TABLE IF NOT EXISTS "booking_questions" (
    "id" TEXT NOT NULL,
    "appointmentTypeId" TEXT NOT NULL,
    "label" VARCHAR(300) NOT NULL,
    "type" "BookingQuestionType" NOT NULL DEFAULT 'TEXT',
    "options" VARCHAR(2000),
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BookingAnswer
CREATE TABLE IF NOT EXISTS "booking_answers" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" VARCHAR(5000) NOT NULL,
    CONSTRAINT "booking_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GoogleCalendarConnection
CREATE TABLE IF NOT EXISTS "google_calendar_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleEmail" VARCHAR(254) NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "calendarId" VARCHAR(254) NOT NULL DEFAULT 'primary',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "google_calendar_connections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "booking_questions_appointmentTypeId_position_idx" ON "booking_questions"("appointmentTypeId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "booking_answers_bookingId_questionId_key" ON "booking_answers"("bookingId", "questionId");
CREATE INDEX IF NOT EXISTS "booking_answers_bookingId_idx" ON "booking_answers"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "google_calendar_connections_userId_key" ON "google_calendar_connections"("userId");

DO $$ BEGIN
  ALTER TABLE "booking_questions" ADD CONSTRAINT "booking_questions_appointmentTypeId_fkey"
      FOREIGN KEY ("appointmentTypeId") REFERENCES "appointment_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "booking_answers" ADD CONSTRAINT "booking_answers_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "booking_answers" ADD CONSTRAINT "booking_answers_questionId_fkey"
      FOREIGN KEY ("questionId") REFERENCES "booking_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
