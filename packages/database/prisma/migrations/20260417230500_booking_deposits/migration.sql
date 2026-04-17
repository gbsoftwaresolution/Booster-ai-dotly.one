-- Add deposit config to appointment types
ALTER TABLE "appointment_types"
ADD COLUMN "depositEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "depositAmountUsdt" VARCHAR(32);

-- Add deposit tracking fields to bookings
ALTER TABLE "bookings"
ADD COLUMN "depositPaymentId" VARCHAR(100),
ADD COLUMN "depositTxHash" VARCHAR(66),
ADD COLUMN "depositAmountUsdt" VARCHAR(32);

-- Deposit lifecycle enum
CREATE TYPE "BookingDepositStatus" AS ENUM ('INTENT_CREATED', 'VERIFIED', 'USED', 'EXPIRED');

-- Dedicated booking deposit persistence
CREATE TABLE "booking_deposits" (
  "id" TEXT NOT NULL,
  "paymentId" VARCHAR(100) NOT NULL,
  "appointmentTypeId" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "guestName" VARCHAR(120) NOT NULL,
  "guestEmail" VARCHAR(254) NOT NULL,
  "walletAddress" VARCHAR(42) NOT NULL,
  "recipientAddress" VARCHAR(42) NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "amountUsdt" VARCHAR(32) NOT NULL,
  "amountRaw" VARCHAR(64) NOT NULL,
  "tokenAddress" VARCHAR(42) NOT NULL,
  "chainId" INTEGER NOT NULL,
  "status" "BookingDepositStatus" NOT NULL DEFAULT 'INTENT_CREATED',
  "txHash" VARCHAR(66),
  "verifiedAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "booking_deposits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "booking_deposits_paymentId_key" ON "booking_deposits"("paymentId");
CREATE UNIQUE INDEX "booking_deposits_txHash_key" ON "booking_deposits"("txHash");
CREATE INDEX "booking_deposits_ownerUserId_status_idx" ON "booking_deposits"("ownerUserId", "status");
CREATE INDEX "booking_deposits_appointmentTypeId_startAt_idx" ON "booking_deposits"("appointmentTypeId", "startAt");

ALTER TABLE "booking_deposits"
ADD CONSTRAINT "booking_deposits_appointmentTypeId_fkey"
FOREIGN KEY ("appointmentTypeId") REFERENCES "appointment_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_deposits"
ADD CONSTRAINT "booking_deposits_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
