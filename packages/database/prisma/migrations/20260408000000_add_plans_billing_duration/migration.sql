-- Migration: add_plans_billing_duration
-- Adds STARTER and AGENCY to the Plan enum,
-- adds BillingDuration enum,
-- adds billingDuration and amountUsdt columns to subscriptions.

-- 1. Extend the Plan enum with new values
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'STARTER';
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'AGENCY';

-- 2. Create the BillingDuration enum
DO $$ BEGIN
  CREATE TYPE "BillingDuration" AS ENUM ('MONTHLY', 'SIX_MONTHS', 'ANNUAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Add new columns to subscriptions
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "billingDuration" "BillingDuration",
  ADD COLUMN IF NOT EXISTS "amountUsdt"       TEXT;
