-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateTable
CREATE TABLE "appointment_types" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "durationMins" INTEGER NOT NULL DEFAULT 30,
    "color" VARCHAR(7) NOT NULL DEFAULT '#0ea5e9',
    "bufferDays" INTEGER NOT NULL DEFAULT 60,
    "bufferAfterMins" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "location" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_rules" (
    "id" TEXT NOT NULL,
    "appointmentTypeId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,

    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "appointmentTypeId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "guestName" VARCHAR(200) NOT NULL,
    "guestEmail" VARCHAR(254) NOT NULL,
    "guestNotes" VARCHAR(2000),
    "cancelReason" VARCHAR(500),
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appointment_types_ownerUserId_slug_key" ON "appointment_types"("ownerUserId", "slug");

-- CreateIndex
CREATE INDEX "appointment_types_ownerUserId_idx" ON "appointment_types"("ownerUserId");

-- CreateIndex
CREATE INDEX "availability_rules_appointmentTypeId_idx" ON "availability_rules"("appointmentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_token_key" ON "bookings"("token");

-- CreateIndex
CREATE INDEX "bookings_ownerUserId_startAt_idx" ON "bookings"("ownerUserId", "startAt");

-- CreateIndex
CREATE INDEX "bookings_appointmentTypeId_startAt_idx" ON "bookings"("appointmentTypeId", "startAt");

-- CreateIndex
CREATE INDEX "bookings_token_idx" ON "bookings"("token");

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "appointment_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "appointment_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
